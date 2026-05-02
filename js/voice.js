/* ============================================================
   voice.js — Full voice pipeline with fuzzy matching
   Speech → Text → Normalise → Parse → Fuzzy Match → Confirm
   ============================================================ */

/* ── Number word maps ───────────────────────────────── */
const WORD_NUMS = {
  'ek':1,'eke':1,'aek':1,'one':1,'ek':1,
  'do':2,'dui':2,'dono':2,'two':2,
  'teen':3,'tin':3,'tine':3,'three':3,
  'char':4,'chaar':4,'four':4,
  'paanch':5,'panch':5,'five':5,
  'chhe':6,'choi':6,'six':6,
  'saat':7,'sat':7,'seven':7,
  'aath':8,'aat':8,'eight':8,
  'nau':9,'noy':9,'nine':9,
  'das':10,'dosh':10,'ten':10,
  'baara':12,'twelve':12,
  'aadha':0.5,'adha':0.5,'half':0.5,'aadh':0.5,
  'paav':0.25,'paona':0.75,'savaa':1.25,
  'dedh':1.5,'dhai':2.5,
};

/* ── Unit normalisation ─────────────────────────────── */
const UNIT_MAP = {
  'kilo':1,'kg':1,'kilogram':1,'kilo gram':1,
  'gram':0.001,'g':0.001,'gm':0.001,'graam':0.001,
  '100g':0.1,'100gm':0.1,'100 gram':0.1,
  '200g':0.2,'200 gram':0.2,'200gm':0.2,
  '250g':0.25,'250 gram':0.25,'250gm':0.25,'paav kilo':0.25,
  '500g':0.5,'500 gram':0.5,'500gm':0.5,'aadha kilo':0.5,
  'litre':1,'liter':1,'l':1,'ltr':1,
  'packet':1,'pack':1,'pkt':1,'pouch':1,'poach':1,
  'piece':1,'pcs':1,'pc':1,'nos':1,'number':1,
  'bottle':1,'bottel':1,
};

/* ── Filler words to strip ──────────────────────────── */
const FILLERS = [
  'karo','add','dijiye','dena','lao','chahiye','de do','dedo',
  'lagao','daal','daalo','please','jaldi','abhi','aur','bhi',
  'mujhe','chahie','do na','dena ji','dedo ji',
];

/* ── State ──────────────────────────────────────────── */
let voiceActive = false;
let voiceParsed = null;
let recognition = null;

/* ── Toggle ─────────────────────────────────────────── */
function toggleVoice() { voiceActive ? stopVoice() : startVoice(); }

function startVoice() {
  voiceActive = true;
  $('voice-btn').classList.add('listening');
  $('voice-overlay').classList.add('show');
  $('vo-transcript').textContent = '—';
  $('vo-parsed').textContent = '';
  $('vo-suggestions').innerHTML = '';
  $('vo-confirm').disabled = true;
  voiceParsed = null;

  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'hi-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = e => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ');
      handleVoiceText(text);
    };
    recognition.onerror = e => {
      $('vo-transcript').textContent = `Mic error: ${e.error}`;
    };
    recognition.onend = () => { if (voiceActive) try { recognition.start(); } catch(_){} };
    try { recognition.start(); } catch(_) { runVoiceDemo(); }
  } else {
    runVoiceDemo();
  }
}

function stopVoice()   { cancelVoice(); }
function cancelVoice() {
  voiceActive = false;
  $('voice-btn').classList.remove('listening');
  $('voice-overlay').classList.remove('show');
  if (recognition) { try { recognition.stop(); } catch(_){} recognition = null; }
}

function confirmVoice() {
  if (!voiceParsed) return;
  addProductToOrder(voiceParsed.product, voiceParsed.qty);
  cancelVoice();
}

/* ── Demo simulation ────────────────────────────────── */
function runVoiceDemo() {
  const demos = [
    '2 kilo cheeni', 'maggi 3 packet', 'doodh ek litre',
    'aadha kilo chawal', '250 gram namak', 'teen packet biscuit',
    'do kilo atta', '500 gram dal', 'paav kilo chai patti',
  ];
  const phrase = demos[Math.floor(Math.random() * demos.length)];
  setTimeout(() => { $('vo-transcript').textContent = `(demo) ${phrase}`; handleVoiceText(phrase); }, 900);
}

/* ── Main handler ───────────────────────────────────── */
function handleVoiceText(rawText) {
  $('vo-transcript').textContent = rawText;
  const result = parseVoiceCommand(rawText);

  if (!result) {
    voiceParsed = null;
    $('vo-parsed').textContent = '❓ Not recognised';
    $('vo-confirm').disabled = true;
    showFuzzyFallback(rawText);
    return;
  }

  if (result.type === 'total') {
    const o = currentOrder();
    $('vo-parsed').textContent = o ? `Total: ₹${fmtPrice(orderTotal(o))}` : 'No active order';
    $('vo-confirm').disabled = true;
    $('vo-suggestions').innerHTML = '';
    return;
  }

  voiceParsed = result;
  $('vo-parsed').textContent = `→ ${result.product.name} × ${fmtQty(result.qty)} ${result.product.unit}  (₹${fmtPrice(result.product.price * result.qty)})`;
  $('vo-confirm').disabled = false;
  $('vo-suggestions').innerHTML = '';
}

/* ── Parser: text → intent ──────────────────────────── */
function parseVoiceCommand(text) {
  let t = text.toLowerCase();
  FILLERS.forEach(w => { t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), ''); });
  t = t.replace(/\s+/g, ' ').trim();

  if (/total|hisaab|bill|kitna|amount|jumlaa/.test(t)) return { type: 'total' };

  // ── Unit-based quantity extraction ──────────────────
  let qty = 1;
  let unitMultiplier = 1;

  // Check for "gram" patterns first: "250 gram", "500gm"
  const gramMatch = t.match(/(\d+\.?\d*)\s*(gram|gm|g)\b/);
  if (gramMatch) {
    qty = parseFloat(gramMatch[1]) / 1000;  // convert to kg
    t = t.replace(gramMatch[0], '').trim();
  } else {
    // Check numeric quantity
    const numMatch = t.match(/(\d+\.?\d*)/);
    if (numMatch) {
      qty = parseFloat(numMatch[1]);
      t = t.replace(numMatch[0], '').trim();
    } else {
      // Word numbers
      for (const [word, num] of Object.entries(WORD_NUMS)) {
        const re = new RegExp(`\\b${word}\\b`);
        if (re.test(t)) { qty = num; t = t.replace(re, '').trim(); break; }
      }
    }

    // Check for "kilo" / "kg" multiplier
    const kiloMatch = t.match(/\b(kilo|kg|kilogram)\b/);
    if (kiloMatch) { unitMultiplier = 1; t = t.replace(kiloMatch[0], '').trim(); }
  }

  qty = Math.round(qty * unitMultiplier * 1000) / 1000;
  if (qty <= 0 || !isFinite(qty)) qty = 1;

  t = t.replace(/\s+/g, ' ').trim();

  // ── Product matching: exact → alias → fuzzy ──────────
  let matched = exactMatch(t) || aliasMatch(t) || fuzzyMatch(t);
  if (!matched) return null;

  return { type: 'add', product: matched, qty };
}

/* ── Exact name match ───────────────────────────────── */
function exactMatch(t) {
  return DB.products.find(p => p.name.toLowerCase() === t) || null;
}

/* ── Alias substring match ──────────────────────────── */
function aliasMatch(t) {
  for (const p of DB.products) {
    const names = [p.name.toLowerCase(), ...p.aliases];
    if (names.some(n => t.includes(n) || n.includes(t))) return p;
  }
  return null;
}

/* ── Fuzzy match (Levenshtein distance) ─────────────── */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, (_,i) => Array.from({length:n+1}, (_,j) => i===0?j:j===0?i:0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyMatch(t) {
  const words = t.split(/\s+/).filter(Boolean);
  let best = null, bestScore = Infinity;

  DB.products.forEach(p => {
    const names = [p.name.toLowerCase(), ...p.aliases];
    names.forEach(name => {
      // Full string distance
      const d1 = levenshtein(t, name);
      // Word-level: check each word against each alias
      words.forEach(word => {
        const d2 = levenshtein(word, name);
        const score = Math.min(d1, d2);
        // Allow up to 2 edits for short words, 3 for longer
        const threshold = name.length <= 4 ? 2 : 3;
        if (score < bestScore && score <= threshold) {
          bestScore = score; best = p;
        }
      });
    });
  });
  return best;
}

/* ── Fuzzy suggestions when no match found ──────────── */
function showFuzzyFallback(rawText) {
  const t = rawText.toLowerCase();
  const suggestions = [];

  DB.products.forEach(p => {
    const names = [p.name.toLowerCase(), ...p.aliases];
    const minDist = Math.min(...names.map(n => levenshtein(t.slice(0, n.length+3), n)));
    if (minDist <= 4) suggestions.push({ p, score: minDist });
  });

  suggestions.sort((a,b) => a.score - b.score);
  const top = suggestions.slice(0, 3);

  if (!top.length) {
    $('vo-suggestions').innerHTML = '<div style="font-size:11px;color:var(--muted)">No close matches found</div>';
    return;
  }

  $('vo-suggestions').innerHTML = top.map(({p}) =>
    `<button class="vo-suggestion" onclick="voiceSelectSuggestion(${p.id})">${escHtml(p.name)}</button>`
  ).join('');
}

function voiceSelectSuggestion(pid) {
  const p = findProduct(pid);
  if (!p) return;
  voiceParsed = { type:'add', product: p, qty: 1 };
  $('vo-parsed').textContent = `→ ${p.name} × 1 ${p.unit}`;
  $('vo-confirm').disabled = false;
  $('vo-suggestions').innerHTML = '';
}
