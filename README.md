# 🛒 Dukaan POS — Kirana Billing System

> A fast, offline-first Point of Sale system built for small retail (kirana) stores — featuring Hindi/Hinglish voice input, multi-order billing, inventory management, and customer due tracking. Zero dependencies. Pure HTML, CSS, and JavaScript.

---

## 📸 Features at a Glance

| Module | What it does |
|---|---|
| 💰 **Billing** | Create multiple simultaneous orders, add/remove items, mark delivered, finalize |
| 🎤 **Voice Input** | Speak in Hindi/Hinglish — *"2 kilo cheeni"*, *"maggi 3 packet"* |
| 📦 **Inventory** | Add products with aliases, track stock, set low-stock alerts |
| 👥 **Customers** | Manage profiles, track outstanding dues, record payments |
| 📜 **History** | Full order log with CSV export |

---

## 🚀 Getting Started

### Option 1 — Open Locally (No Setup)
```bash
# Just open the file in any browser
open index.html
````

### Option 2 — Deploy on Netlify (Free, 10 seconds)

1. Go to [netlify.com/drop](https://netlify.com/drop)
2. Drag and drop the `dukaan-pos/` folder
3. Your app is live ✅

### Option 3 — GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dukaan-pos.git
git push -u origin main
```

Then go to **Settings → Pages → Source: main branch** → Save.

---

## 📁 Project Structure

```
dukaan-pos/
├── index.html              # App shell — markup only, no inline scripts or styles
│
├── css/
│   ├── reset.css           # Browser normalisation
│   ├── variables.css       # Design tokens (colors, spacing, radii, shadows)
│   ├── layout.css          # App grid, topbar, sidebar, center, right panel
│   ├── components.css      # Buttons, chips, order items, voice overlay, toast
│   ├── views.css           # Inventory, customer, history card styles
│   ├── modals.css          # Dialog boxes and form elements
│   └── responsive.css      # Tablet (≤900px) and mobile (≤480px) breakpoints
│
└── js/
    ├── db.js               # Data schema, seed data, localStorage persistence
    ├── utils.js            # DOM helpers, escaping, toast, clock, CSV export
    ├── orders.js           # Order lifecycle — create, modify, finalize, render
    ├── inventory.js        # Product CRUD, stock adjustment, mini stock list
    ├── customers.js        # Customer CRUD, due tracking, payment recording
    ├── voice.js            # Voice pipeline — Speech API → parse → action
    ├── modals.js           # All modal dialogs and form submit handlers
    ├── router.js           # View switching, history render
    └── app.js              # Boot sequence, all DOM event bindings
```

---

## 🎤 Voice Input — How It Works

The voice pipeline follows this flow:

```
Microphone → SpeechRecognition API (hi-IN)
           → Raw transcript
           → Strip filler words (karo, dijiye, add, dena…)
           → Extract quantity (numeric or spoken: "teen" → 3)
           → Match product by name or alias
           → Confirm with user → Apply to order
```

**Supported phrases (examples):**

```
"2 kilo cheeni"          → Cheeni × 2 kg
"maggi teen packet"      → Maggi × 3 packets
"doodh ek litre"         → Doodh × 1 litre
"do kilo atta add karo"  → Atta × 2 kg
"total batao"            → Shows current order total
```

> **Note:** If your browser does not support the Web Speech API, the voice module runs a built-in demo simulation so you can still see the full flow.

---

## 💾 Data & Persistence

- All data is stored in **`localStorage`** under the key `dukaan_pos_v1`
- Data persists across page refreshes and browser restarts
- **No internet connection required** — fully offline-first
- Export order history any time as a `.csv` file

### Data Schema (simplified)

```js
// Product
{ id, name, aliases[], price, unit, stock, lowAt }

// Customer
{ id, name, phone, due, initials }

// Order
{ id, items[], customerId, finalized, payment, created, finalizedAt }

// Order Item (price locked at time of sale)
{ productId, name, price, unit, qty, delivered }
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl / Cmd + N` | Create new order |
| `Escape` | Close modal or cancel voice |
| `Enter` (in search) | Add exact-match product |

---

## 🏗️ Architecture Principles

- **Separation of concerns** — data, logic, UI, and voice are fully independent modules
- **No frameworks** — vanilla JS only; easy to read, audit, and extend
- **Offline-first** — every feature works without a network connection
- **Price integrity** — item price is locked at the time of sale, never retroactively changed
- **No overselling** — stock validation prevents adding more than available quantity
- **Append-only history** — finalized orders are deep-copied and never modified

---

## 🔮 Roadmap / Future Scope

- [ ] Bengali (`bn-IN`) voice language toggle
- [ ] Printable / shareable receipt (PDF or WhatsApp)
- [ ] Barcode / QR scanner integration
- [ ] PIN-based staff login (owner vs. cashier role)
- [ ] Multi-device sync via a cloud backend (Firebase / Supabase)
- [ ] Daily / weekly sales summary dashboard
- [ ] Low-stock WhatsApp/SMS alert

---

## 🛠️ Built With

- **HTML5** — semantic markup, no build step
- **CSS3** — custom properties, CSS Grid, Flexbox
- **Vanilla JavaScript (ES6+)** — modular, no bundler required
- **Web Speech API** — browser-native voice recognition
- **localStorage API** — offline data persistence

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 👤 Author

Built with ❤️ for small shopkeepers across India.  
Contributions and feedback welcome — open an issue or PR!
