/* ============================================================
   voice.js — Voice pipeline: Speech → Text → Parse → Action
   Supports Hindi (hi-IN), Hinglish, and English
   ============================================================ */

/* ── Word-to-number map (Hindi + Bengali phonetics + English) ── */
const WORD_NUMS = {
  'ek': 1, 'eke': 1, 'aek': 1, 'one': 1,
  'do': 2, 'dui': 2, 'dono': 2, 'two': 2,
  'teen': 3, 'tin': 3, 'tine': 3, 'three': 3,
  'char': 4, 'chaar': 4, 'chari': 4, 'four': 4,
  'paanch': 5, 'panch': 5, 'pach': 5, 'five': 5,
  'chhe': 6, 'choi': 6, 'six': 6,
  'saat': 7, 'sat': 7, 'sate': 7, 'seven': 7,
  'aath': 8, 'aat': 8, 'ato': 8, 'eight': 8,
  'nau': 9, 'noy': 9, 'nine': 9,
  'das': 10, 'dosh': 10, 'ten': 10,
  'baara': 12, 'twelve': 12,
  'adha': 0.5, 'half': 0.5,
};

/* ── Filler words to strip before parsing ────────────────────── */
const FILLER_WORDS = [
  'karo', 'add', 'dijiye', 'dena', 'lao', 'chahiye',
  'de do', 'dedo', 'lagao', 'daal', 'daalo', 'please',
  'jaldi', 'abhi', 'aur', 'bhi',
];

/* ── State ───────────────────────────────────────────────────── */
let voiceActive = false;
let voiceParsed = null;
let recognition = null;

/* ── Toggle ──────────────────────────────────────────────────── */
function toggleVoice() {
  voiceActive ? stopVoice() : startVoice();
}

function startVoice() {
  voiceActive = true;
  $('voice-btn').classList.add('listening');
  $('voice-overlay').classList.add('show');
  $('vo-transcript').textContent = '—';
  $('vo-parsed').textContent     = '';
  $('vo-confirm').disabled       = true;
  voiceParsed = null;

  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang            = 'hi-IN';
    recognition.continuous      = true;
    recognition.interimResults  = true;

    recognition.onresult = e => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ');
      handleVoiceText(text);
    };

    recognition.onerror = e => {
      $('vo-transcript').textContent = `Error: ${e.error} — try typing instead`;
    };

    recognition.onend = () => {
      if (voiceActive) { try { recognition.start(); } catch (_) {} }
    };

    try { recognition.start(); }
    catch (_) { runVoiceDemo(); }
  } else {
    runVoiceDemo();
  }
}

function stopVoice() { cancelVoice(); }

function cancelVoice() {
  voiceActive = false;
  $('voice-btn').classList.remove('listening');
  $('voice-overlay').classList.remove('show');
  if (recognition) { try { recognition.stop(); } catch (_) {} recognition = null; }
}

function confirmVoice() {
  if (!voiceParsed) return;
  addProductToOrder(voiceParsed.product, voiceParsed.qty);
  cancelVoice();
}

/* ── Demo simulation (when speech API unavailable) ───────────── */
function runVoiceDemo() {
  const demos = [
    '2 kilo cheeni',
    'maggi 3 packet',
    'doodh ek litre',
    'namak add karo',
    'teen packet biscuit',
    'do kilo atta',
    'aloo paanch kilo',
    'sarso tel ek bottle',
  ];
  const phrase = demos[Math.floor(Math.random() * demos.length)];
  setTimeout(() => {
    $('vo-transcript').textContent = `(demo) ${phrase}`;
    handleVoiceText(phrase);
  }, 1000);
}

/* ── Core: text → parsed intent ─────────────────────────────── */
function handleVoiceText(rawText) {
  $('vo-transcript').textContent = rawText;

  const result = parseVoiceCommand(rawText);

  if (!result) {
    voiceParsed = null;
    $('vo-parsed').textContent = 'Product not recognised — try again';
    $('vo-confirm').disabled   = true;
    return;
  }

  if (result.type === 'total') {
    const order = currentOrder();
    $('vo-parsed').textContent = order
      ? `Total: ₹${orderTotal(order).toFixed(0)}`
      : 'No active order';
    $('vo-confirm').disabled = true;
    return;
  }

  // type === 'add'
  voiceParsed = result;
  $('vo-parsed').textContent =
    `→ ${result.product.name} × ${result.qty} ${result.product.unit}  (₹${(result.product.price * result.qty).toFixed(0)})`;
  $('vo-confirm').disabled = false;
}

/* ── Parser: text → { type, product, qty } ───────────────────── */
function parseVoiceCommand(text) {
  // Normalise
  let t = text.toLowerCase();
  FILLER_WORDS.forEach(w => { t = t.replace(new RegExp(w, 'g'), ''); });
  t = t.replace(/\s+/g, ' ').trim();

  // Total / bill query
  if (/total|hisaab|bill|kitna|amount|jumlaa/.test(t)) return { type: 'total' };

  // Extract quantity
  let qty = 1;
  const numMatch = t.match(/(\d+\.?\d*)/);
  if (numMatch) {
    qty = parseFloat(numMatch[1]);
  } else {
    for (const [word, num] of Object.entries(WORD_NUMS)) {
      if (t.includes(word)) { qty = num; break; }
    }
  }

  // Match product name / alias
  let matched = null;
  for (const p of DB.products) {
    const names = [p.name.toLowerCase(), ...p.aliases];
    if (names.some(n => t.includes(n))) { matched = p; break; }
  }

  if (!matched) return null;

  return { type: 'add', product: matched, qty };
}
