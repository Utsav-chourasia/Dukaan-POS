/* ============================================================
   db.js — Data layer: schema, seed data, localStorage persistence
   All other modules read/write through this object only.
   ============================================================ */

const DB = {

  storeName: 'My Kirana Store',

  products: [
    { id:1,  name:'Cheeni',     aliases:['sugar','shakkar','chini','cheeni'],            price:45,  unit:'kg',     stock:50,  lowAt:10 },
    { id:2,  name:'Doodh',      aliases:['milk','doodh','dudh'],                          price:28,  unit:'litre',  stock:20,  lowAt:5  },
    { id:3,  name:'Maggi',      aliases:['maggi','noodles','noodle'],                     price:14,  unit:'packet', stock:100, lowAt:20 },
    { id:4,  name:'Atta',       aliases:['atta','flour','wheat','aata'],                  price:40,  unit:'kg',     stock:30,  lowAt:8  },
    { id:5,  name:'Chai Patti', aliases:['tea','chai','chaa','patti','chaipatti','cha'],  price:220, unit:'kg',     stock:8,   lowAt:5  },
    { id:6,  name:'Sarso Tel',  aliases:['oil','tel','mustard','sarso','sorse','teel'],   price:130, unit:'litre',  stock:12,  lowAt:5  },
    { id:7,  name:'Namak',      aliases:['salt','namak','noon','loon'],                   price:20,  unit:'kg',     stock:40,  lowAt:10 },
    { id:8,  name:'Dal Masur',  aliases:['masur','masoor','dal','lentil','daal'],         price:90,  unit:'kg',     stock:15,  lowAt:5  },
    { id:9,  name:'Biscuit',    aliases:['biscuit','parle','krack','snack','biskut'],     price:10,  unit:'packet', stock:60,  lowAt:15 },
    { id:10, name:'Sabun',      aliases:['soap','sabun','saboon'],                        price:25,  unit:'piece',  stock:30,  lowAt:8  },
    { id:11, name:'Chawal',     aliases:['rice','chawal','chawol','bhat'],                price:60,  unit:'kg',     stock:80,  lowAt:20 },
    { id:12, name:'Aloo',       aliases:['potato','aloo','alu'],                          price:30,  unit:'kg',     stock:25,  lowAt:10 },
  ],

  customers: [
    { id:1, name:'Ramesh Sahu',  phone:'9876543210', due:350,  initials:'RS' },
    { id:2, name:'Puja Devi',    phone:'8765432109', due:0,    initials:'PD' },
    { id:3, name:'Manoj Kumar',  phone:'7654321098', due:1200, initials:'MK' },
    { id:4, name:'Seema Rani',   phone:'6543210987', due:0,    initials:'SR' },
    { id:5, name:'Bablu Sheikh', phone:'5432109876', due:500,  initials:'BS' },
  ],

  orders:  [],   // active (open) orders
  history: [],   // finalized orders (append-only)

  nextOrderId:  1001,
  nextProductId: 13,
  nextCustomerId: 6,
};

/* ── Persistence ─────────────────────────────────────────────── */
const STORAGE_KEY = 'dukaan_pos_v1';

function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(DB, saved);
    }
  } catch (e) {
    console.warn('Could not load from localStorage:', e);
  }
}

/* ── Finders ─────────────────────────────────────────────────── */
function findProduct(id)  { return DB.products.find(p => p.id === id);  }
function findCustomer(id) { return DB.customers.find(c => c.id === id); }
function findOrder(id)    { return DB.orders.find(o => o.id === id);    }
