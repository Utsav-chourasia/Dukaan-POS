/* ============================================================
   db.js — Data layer: schema, seed data, localStorage
   ============================================================ */
const DB = {
  storeName: 'My Kirana Store',
  products: [
    { id:1,  name:'Cheeni',     aliases:['sugar','shakkar','chini','cheeni','cheen'],         price:45,  unit:'kg',     stock:50,  lowAt:10 },
    { id:2,  name:'Doodh',      aliases:['milk','doodh','dudh','doodha'],                     price:28,  unit:'litre',  stock:20,  lowAt:5  },
    { id:3,  name:'Maggi',      aliases:['maggi','noodles','noodle','magi'],                  price:14,  unit:'packet', stock:100, lowAt:20 },
    { id:4,  name:'Atta',       aliases:['atta','flour','wheat','aata','ata'],                price:40,  unit:'kg',     stock:30,  lowAt:8  },
    { id:5,  name:'Chai Patti', aliases:['tea','chai','chaa','patti','chaipatti','cha','cai'],price:220, unit:'kg',     stock:8,   lowAt:5  },
    { id:6,  name:'Sarso Tel',  aliases:['oil','tel','mustard','sarso','sorse','teel','sarson'],price:130,unit:'litre', stock:12,  lowAt:5  },
    { id:7,  name:'Namak',      aliases:['salt','namak','noon','loon','nabhak','namk'],        price:20,  unit:'kg',     stock:40,  lowAt:10 },
    { id:8,  name:'Dal Masur',  aliases:['masur','masoor','dal','lentil','daal','daalmashur'], price:90,  unit:'kg',     stock:15,  lowAt:5  },
    { id:9,  name:'Biscuit',    aliases:['biscuit','parle','krack','snack','biskut','biskit'], price:10,  unit:'packet', stock:60,  lowAt:15 },
    { id:10, name:'Sabun',      aliases:['soap','sabun','saboon','saboons'],                   price:25,  unit:'piece',  stock:30,  lowAt:8  },
    { id:11, name:'Chawal',     aliases:['rice','chawal','chawol','bhat','bhaat','chaawal'],   price:60,  unit:'kg',     stock:80,  lowAt:20 },
    { id:12, name:'Aloo',       aliases:['potato','aloo','alu','aaloo'],                       price:30,  unit:'kg',     stock:25,  lowAt:10 },
  ],
  customers: [
    { id:1, name:'Ramesh Sahu',  phone:'9876543210', due:350,  initials:'RS' },
    { id:2, name:'Puja Devi',    phone:'8765432109', due:0,    initials:'PD' },
    { id:3, name:'Manoj Kumar',  phone:'7654321098', due:1200, initials:'MK' },
    { id:4, name:'Seema Rani',   phone:'6543210987', due:0,    initials:'SR' },
    { id:5, name:'Bablu Sheikh', phone:'5432109876', due:500,  initials:'BS' },
  ],
  orders:  [],
  history: [],
  nextOrderId:   1001,
  nextProductId: 13,
  nextCustomerId: 6,
};

const STORAGE_KEY = 'dukaan_pos_v2';

function saveDB() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); } catch(e){}
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(DB, JSON.parse(raw));
  } catch(e){}
}

/* Finders */
function findProduct(id)  { return DB.products.find(p => p.id === id);  }
function findCustomer(id) { return DB.customers.find(c => c.id === id); }
function findOrder(id)    { return DB.orders.find(o => o.id === id);    }

/* ── Validation helpers ─────────────────────────────── */
/**
 * Parse a quantity string — supports decimals and fractions.
 * Returns null if invalid.
 */
function parseQty(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim();
  // fraction: "1/4"
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const v = parseInt(frac[1]) / parseInt(frac[2]);
    return isFinite(v) && v > 0 ? v : null;
  }
  const v = parseFloat(s);
  return isFinite(v) && v > 0 ? v : null;
}

/** Format qty: strip unnecessary trailing zeros */
function fmtQty(n) {
  if (n === undefined || n === null) return '0';
  // round to 3dp max to avoid floating-point noise
  const rounded = Math.round(n * 1000) / 1000;
  return parseFloat(rounded.toFixed(3)).toString();
}

/** Format price — always 2dp */
function fmtPrice(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}
