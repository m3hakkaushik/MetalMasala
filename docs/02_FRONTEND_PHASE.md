# Frontend Phase — Metal मसाला storefront + admin (React + Vite + Tailwind)

> **Owner:** anyone on the team · **Branch:** `frontend/phase-1` · **Runs before all backend phases.**
> Read `00_PROJECT_OVERVIEW.md` and `01_API_CONTRACT.md` first.

**Mission:** build an exquisite, high-end, culturally rooted storefront that runs **entirely on a mock API (MSW)** shaped exactly like the real contract, so that backend phases can replace the mock group by group without touching UI code.

---

## 1. Success criteria

- Looks and feels like a premium D2C brand, not a template. One memorable hero moment, disciplined everywhere else.
- Every page in §5 works on **mobile (360 px)** through large desktop.
- Complete purchase journey works on mocks: browse → filter → product → bag → login → checkout → confirmation → order tracking.
- Admin area (products, orders, analytics, users) works on mocks.
- Data layer is **contract-faithful**: switching `VITE_MOCK_GROUPS` from `all` to `` (empty) should "just work" against a finished backend.
- Lighthouse (mobile, production build): Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 90.

---

## 2. Stack & setup

```bash
npm create vite@latest client -- --template react
cd client
npm i react-router-dom @tanstack/react-query zustand axios react-hook-form zod @hookform/resolvers \
      framer-motion lucide-react react-helmet-async recharts socket.io-client clsx
npm i -D tailwindcss msw eslint prettier   # + Tailwind's Vite integration per its current docs
npm i @fontsource/yatra-one @fontsource/instrument-sans @fontsource/mukta @fontsource/kalam
npx msw init public/ --save
```

- **JavaScript (JSX)**, not TypeScript. Use JSDoc `@typedef` for the contract shapes in `src/api/types.js`.
- Vite dev server on `5173`, proxy `/api` and `/socket.io` → `http://localhost:4000` (`vite.config.js`).
- `socket.io-client` is installed now but only wired up in B4.
- **No Lenis / scroll-jacking libraries.** Native scroll only.

`client/.env.example`
```
VITE_API_URL=/api/v1
VITE_SOCKET_URL=http://localhost:4000
VITE_MOCK_GROUPS=all
VITE_DEV_ROLE=
```

---

## 3. Design direction

### 3.1 Brief in one paragraph
Metal मसाला is **oxidized metal and spice-market colour**: blackened silver, verdigris patina on brass, turmeric, Holi gulaal. It is aimed at Gen-Z and millennials who want something loud, rooted and well-made. The site should feel like an **Indian design studio's own lookbook**, not a marketplace. High-end here = confident restraint, fine typography, flawless spacing, great product presentation — *not* gold-on-black luxury cliché.

### 3.2 Palette (tokens)

| Token | Hex | Role |
|---|---|---|
| `patina` | `#0F3D38` | Deep verdigris. Hero, nav, footer, big colour fields |
| `gulaal` | `#D81E70` | Holi-powder pink. Primary buttons, key accents, sale marks |
| `haldi` | `#F5B516` | Turmeric. Stickers, highlights, focus ring, text on patina |
| `kapoor` | `#EDF0EA` | Cool camphor white. Page background (deliberately **not** warm cream) |
| `silver-oxide` | `#23262D` | Blue-black body text and dark UI on light pages |
| `mirchi` | `#C42B12` | Errors, low-stock, destructive actions. Used rarely |

Rules:
- Define as CSS variables, map into Tailwind theme. Never hard-code hex in components.
- **Contrast:** `gulaal` is for fills, large text and icons — **never small text on `patina`** (≈2.7:1). On `patina` use `kapoor` or `haldi` text. White on `gulaal` is fine for buttons. Verify every pairing with a contrast checker.
- Product images sit on a **flat colour plinth** chosen by finish (e.g. `oxidized-silver → gulaal`, `antique-gold → patina`, `oxidized-black → haldi`, `antique-copper → kapoor`, `patina-green → silver-oxide`). This makes the catalogue grid vivid and consistent without photographic backgrounds.

### 3.3 Typography

| Role | Family | Notes |
|---|---|---|
| Display / wordmark / headlines | **Yatra One** | Heavy, sign-painter character; supports **Latin + Devanagari** so "Metal मसाला" renders in one voice |
| Body & UI | **Instrument Sans** (Latin) with **Mukta** as Devanagari fallback | |
| Marginalia (artisan notes, sticker text, handwritten asides) | **Kalam** | Latin + Devanagari; use sparingly |

- Self-host via `@fontsource` (performance + offline demo), `font-display: swap`, subset to Latin + Devanagari.
- Type scale: modular, ~1.25 ratio; body 16–18 px; line length < 75 characters; Devanagari needs **more line-height** (≥ 1.6) than Latin.
- Headlines are a **design element**: tight tracking, big, allowed to overlap imagery and break the grid once or twice on the home page.
- Sentence case everywhere. No tracked ALL-CAPS labels.

### 3.4 The one memorable moment — the hero
**"Shirorekha rail":** Devanagari letters hang from a horizontal top line (the *shirorekha*). The hero wordmark **Metal मसाला** is set huge on a `patina` field, and the shirorekha of "मसाला" is drawn as a continuous rail from which **3–4 pairs of jhumkas/pendants hang on fine chains**. They swing with spring physics in response to **pointer velocity** (desktop) and **scroll velocity** (touch). With `prefers-reduced-motion` they rest at a fixed slight angle.

- Pendants: product cut-outs (transparent PNG/WebP) if available, otherwise hand-built SVG jhumkas.
- Under the wordmark: one line of copy and one button ("Shop the new drop"). **Nothing else competes in the hero.**
- This is where the boldness is spent. Everything else stays quiet and disciplined.

### 3.5 Layout & shape language
- **Asymmetric editorial grid**, left-aligned text. Generous negative space. Large solid colour fields.
- **Shapes encode role** (not one radius everywhere): images and plinths = square corners; buttons, chips, filter pills = fully rounded; inputs = 4 px; drawers/modals = square, edge-attached.
- **Stickers:** small `haldi` (or `gulaal`) circular/scalloped badges, rotated −6° to −10°, hand-lettered feel. Only for real information: "New drop", "Only 3 left", "20% off". Max one per card.
- Optional cultural motifs (paisley, jaali lattice, kalash line-art) as **single-colour SVG patterns at very low contrast** on large fields. Never on top of text or products.
- Category picker on home: styled after a **masala dabba** (round spice tin with compartments) — flat vector, one per category — *or* oversized typographic list if time is short.

### 3.6 Motion rules
- **One orchestrated moment on load:** the hero (§3.4). That's the only non-user-triggered animation.
- Everything else animates **in response to a user action** and shows what changed: cart drawer slides in; "Add to bag" sends a small thumbnail arcing to the bag icon, bag count bumps; wishlist heart pops; filter chips enter/exit; checkout steps cross-fade; quantity change nudges the line total.
- **No** fade-up on every section, **no** hover-lift on every card. Product card hover = swap to the second image (or a subtle plinth shift).
- Respect `prefers-reduced-motion` globally (single hook `useReducedMotion`, wrap every animated component).

### 3.7 Imagery
- Plan for **real photos** dropped into `client/public/products/<slug>-1.webp` (and `-2`, `-3`). If missing, show **generated placeholder art**: SVG jewellery silhouettes on the finish's plinth colour — it must still look intentional.
- `<SmartImage>` component: `loading="lazy"`, explicit `width/height` (no layout shift), blur-up or colour-plinth skeleton, `alt` required.
- Lookbook/UGC strip may use placeholder art blocks with captions.

### 3.8 Copy & microcopy
- Voice: warm, confident, light Hinglish in *headlines and stickers only*; UI text is plain English.
- Buttons are verbs that say exactly what happens: **Add to bag · Checkout · Place order · Save address · Track order**. The same action keeps the same name everywhere (button "Add to bag" → toast "Added to bag").
- Errors say what happened and how to fix it, no apologies: "Pincode must be 6 digits."
- Empty states invite action: "Your bag is empty. Start with the new drop."
- No filler like "Welcome to our amazing store."

### 3.9 Things to avoid (these are the tells of a generated, templated site)
- Warm cream background + high-contrast serif + terracotta accent. Near-black background + one neon accent.
- Same rounded card + same soft grey shadow on everything; gradient washes as decoration.
- Tracked ALL-CAPS eyebrow above every heading; "A · B · C" middle-dot meta strings; "WORD — fragment" labels; "→" appended to every link/button.
- Monospace for small data labels; tinted near-black (`#0B0B0B`) as "black".
- Numbering sections 01/02/03 unless the content is truly a sequence (checkout steps **are**; sections of the home page are not).
- Accenting a single word in a headline with italic/colour.

---

## 4. Quality floor (non-negotiable)

- **Mobile-first**, tested at 360, 768, 1280, 1920.
- Visible **keyboard focus** everywhere (3 px `haldi` ring with offset on dark, `silver-oxide` ring on light).
- Skip-to-content link; semantic landmarks; labelled form controls; `aria-live="polite"` region for cart/toast updates.
- Drawers/modals: focus trap, `Esc` closes, focus returns to trigger.
- All images have meaningful `alt`; decorative SVGs `aria-hidden`.
- Colour is never the only signal (stock status has text, errors have icon + text).
- Route-level code splitting (`React.lazy`): admin, checkout, account are separate chunks.
- Per-route `<title>` and meta description via `react-helmet-async`.

---

## 5. Sitemap & page specs

| Route | Access | Priority | Summary |
|---|---|---|---|
| `/` | public | MUST | Hero (§3.4) → category picker → "New drop" horizontal rail (scroll-snap) → "Made by hand" craft strip (real `craft` data: artisan, region, technique) → "How to style it" lookbook (college / sangeet / office) → review highlights → "Join the drop list" newsletter → footer |
| `/shop` | public | MUST | Filters (category, price range, finish, material, vibes/tags, in-stock), sort, active-filter chips, product grid, "Load more", skeletons, empty state. **All filter state lives in the URL search params** (shareable, back-button safe). Mobile filters = bottom sheet. Facets from `GET /products/facets` |
| `/shop/:categorySlug` | public | MUST | Same page with the category preselected (and category header) |
| `/product/:slug` | public | MUST | Gallery (thumbs + swipe, hover/pinch zoom) · name, tagline, price + discount · rating link · finish/material chips · stock sticker · qty stepper · **Add to bag** · wishlist heart · accordions: Details, Craft (artisan/region/technique), Shipping & returns, Care · "Style it with" rail (related) · reviews list + write-review form (login required) · live viewers badge slot (hidden until B4) · sticky add-to-bag bar on mobile |
| Cart drawer + `/cart` | public (guest cart) | MUST | Line items, qty ±, remove, subtotal, **free-shipping progress bar** (to ₹999), "Checkout" |
| `/checkout` | auth | MUST | **3 steps** (numbering allowed): ① Contact & address (saved addresses picker or new) → ② Delivery & payment (UPI mock, Card mock, COD +₹49) → ③ Review & Place order. Sticky order summary using `POST /pricing/quote`. Zod validation: phone 10 digits, pincode 6 digits |
| `/order/confirmed/:id` | auth | MUST | Order number, summary, timeline, "Track order", "Continue shopping". No confetti |
| `/login`, `/register` | public | MUST | Forms with inline validation; redirect back to intended page; guest cart merges after login |
| `/account` (tabs: Profile, Orders, Wishlist, Addresses) | auth | MUST | Profile edit, address CRUD, wishlist grid, orders list |
| `/orders/:id` | auth | MUST | Order detail with **status timeline**. Frontend simulates live progress on mocks (timer-driven); B4 swaps in Socket.IO |
| AI **Masala Stylist** (floating button → panel) | public | SHOULD | Chat UI with suggestion chips ("Something loud for a sangeet", "Under ₹800 for office"), inline product cards in replies, typing state, graceful `AI_UNAVAILABLE` fallback |
| Search overlay | public | SHOULD | `/` or ⌘K opens; debounced `q`; shows top 6 + "See all results" |
| `/about`, `/contact`, `/faq`, `/shipping-returns` | public | SHOULD | About = brand + artisans story. Contact form → `POST /contact` |
| 404 page | public | MUST | On-brand, helpful ("This page isn't in the collection") |
| `/admin` (dashboard) | manager+/admin | SHOULD | KPI row + revenue line chart + sales-by-category bar + top products + low-stock list (Recharts, restyled to palette). Admin-only |
| `/admin/products` | manager+ | SHOULD | Table (search, paginate), create/edit form (all fields), delete (admin), **"Generate copy with AI"** button → `POST /ai/describe` |
| `/admin/orders` | manager+ | SHOULD | Table with status filter, status change dropdown (only valid next states), live "new order" toast slot (B4) |
| `/admin/users` | admin | SHOULD | Table, role change, activate/deactivate |
| Coupon code field | — | STRETCH | Only if the team builds coupons later |

Route guards: `<RequireAuth>` and `<RequireRole roles={[…]}>` wrappers; unauthorised → redirect to `/login` (401) or a friendly "Not for your account" page (403).

---

## 6. Data layer (this is what makes later integration painless)

### 6.1 Folder structure
```
client/src/
├── main.jsx                  # boots MSW (only for groups in VITE_MOCK_GROUPS) then React
├── app/                      # router, providers, layouts, guards
├── api/
│   ├── http.js               # Axios instance + interceptors
│   ├── types.js              # JSDoc typedefs from the contract
│   ├── products.js  categories.js  pricing.js  cart.js  orders.js
│   ├── reviews.js   auth.js        users.js    admin.js ai.js  marketing.js
├── features/                 # product/, cart/, checkout/, account/, admin/, stylist/ …
├── components/               # ui/ (Button, Chip, Sticker, Drawer, Modal, Toast, Skeleton, SmartImage…)
├── hooks/                    # useReducedMotion, useDebounce, useSocket (stub), useAuth…
├── stores/                   # cart.store.js, auth.store.js, ui.store.js (Zustand)
├── mocks/
│   ├── browser.js            # setupWorker
│   ├── db.js                 # in-memory DB, persisted to localStorage, resettable
│   ├── data/                 # products.json categories.json reviews.json users.json orders.json  ← handed to B1
│   └── handlers/             # one file per group: products.js categories.js pricing.js …
├── styles/                   # tokens.css, base.css
└── pages/                    # thin route components
```

### 6.2 `api/http.js`
- `baseURL = import.meta.env.VITE_API_URL`, `withCredentials: true`.
- **Request interceptor:** attach `Authorization: Bearer <accessToken>` from the auth store; attach `x-dev-role` if `VITE_DEV_ROLE` is set.
- **Response interceptor:** unwrap the envelope (`response.data.data`, keep `meta`); normalise errors to `{ code, message, details, status }`.
- **401 `TOKEN_EXPIRED` flow:** call `POST /auth/refresh` once (queue concurrent requests behind it), retry the original request; if refresh fails → clear session and go to `/login`. Build this fully now against the mock `/auth/refresh`; B4 only has to verify it.

### 6.3 MSW rules
- One handler file per **group**: `products, categories, pricing, newsletter, contact, reviews, cart, orders, admin, ai, auth, users`.
- `main.jsx` registers handlers **only for groups listed in `VITE_MOCK_GROUPS`** (`all` = every group) and starts the worker with `onUnhandledRequest: 'bypass'` so everything else reaches the Vite proxy → real backend.
- Handlers implement the **same semantics as the contract**: pagination meta, filter/sort params, error codes (`409 OUT_OF_STOCK`, `422 VALIDATION_ERROR`…), the order state machine, business rules from contract §8.
- Latency 250–700 ms random so loading states are real.
- State persists in `localStorage` via `mocks/db.js`; add a hidden `?resetMocks=1` to wipe it.
- Mock **auth**: two seeded accounts — `aarav@example.com / Test@1234` (customer) and `admin@metalmasala.in / Admin@1234` (admin). Also a manager.
- Mock **AI**: keyword → tag/finish/price matching over the catalogue, returns `{reply, products}`.
- Mock **live order tracking**: timer advances order status every ~15 s; the `/orders/:id` page listens via a `useOrderLive(orderId)` hook whose implementation is swappable for Socket.IO in B4.

### 6.4 State
- **TanStack Query** for everything that comes from the server (`['products', params]`, `['product', slug]`, `['cart']`, `['orders']`, …). Set sensible `staleTime`; invalidate after mutations.
- **Zustand:** `cart.store` (guest cart, persisted to localStorage; on login → `POST /cart/merge`, then server cart becomes source of truth), `auth.store` (user + **in-memory** access token; never localStorage), `ui.store` (drawers, search overlay).

### 6.5 Forms
React Hook Form + Zod for login, register, address, checkout, review, contact, admin product form. Validation messages follow §3.8.

---

## 7. Mock catalogue requirements (handed to B1 as the seed)

Produce in `client/src/mocks/data/`, **shaped exactly like contract §3**:

- **8 categories** (see contract §2) with `nameHi`, description, `sortOrder`, image path.
- **32 products** (4 per category; Combos can be 4 bundles). Every product has: 2–3 images, `tagline`, long description (60–100 words), `craft` (artisan, region, technique), `details`, `tags` from the vibe list, `material`, `finish`, realistic prices (₹299 – ₹2,499), `compareAtPrice` on ~1/3 of them, varied `stock` (include a few at 0–5 for low-stock/out-of-stock states), `isFeatured` on ~6, `isNewDrop` on ~6, ratings/sold counts.
- **Product naming:** places, markets, moods — e.g. *Chandni Chowk Jhumka, Kutch Kadambari Choker, Hampi Ruins Ring, Dilli Dhoop Kada, Banaras Ghat Payal, Mehfil Maang Tikka, Pushkar Mela Nose Pin, Sangeet Night Combo*. Names must be unique; slugs derived.
- **Reviews:** 3–6 for the first ~10 products (varied ratings; some verified).
- **Users/orders:** 1 customer with 2 addresses and 3 orders in different statuses; 1 manager; 1 admin; ~20 historical orders (for analytics charts).
- Artisan/studio names are fictional.

---

## 8. Build order for the agent (milestones)

1. **Scaffold & tokens:** Vite, Tailwind, fonts, tokens, base layout, router, providers, `SmartImage`, `Button`, `Sticker`, `Drawer`.
2. **Mock layer:** MSW, `db.js`, seed data, products/categories/pricing handlers, `api/` modules, `http.js`.
3. **Shop & product pages** (URL-synced filters, facets, gallery).
4. **Hero & home** (spend the design budget here; get the shirorekha rail right).
5. **Cart (guest) → auth → merge → checkout → confirmation.**
6. **Account area, order tracking (simulated live).**
7. **Reviews, wishlist, newsletter, contact, static pages, 404.**
8. **AI Stylist panel, search overlay.**
9. **Admin area** (dashboard → products → orders → users).
10. **Polish:** a11y pass, reduced motion, Lighthouse, empty/error states, README section "Frontend".

---

## 9. Acceptance checklist

- [ ] `npm run dev` works with `VITE_MOCK_GROUPS=all`; `npm run build && npm run preview` works.
- [ ] Hero rail swings with pointer/scroll and degrades gracefully with reduced motion.
- [ ] `/shop` filters + sort + search are reflected in the URL; refresh keeps state.
- [ ] Guest cart persists; login merges it; checkout produces a confirmation; order timeline advances.
- [ ] Admin screens work for `manager` and `admin` and are blocked for `customer`.
- [ ] Setting `VITE_MOCK_GROUPS=orders` serves only `/orders*` from MSW and lets everything else fall through (test by pointing at any running server or watching the failed network calls).
- [ ] Contrast/focus/keyboard checks done; Lighthouse targets met.
- [ ] `client/src/mocks/data/*.json` validated against the contract shapes.
- [ ] Root `README.md` skeleton: what it is, how to run client, folder map.
- [ ] `07_IMPLEMENTATION_MAP.md` — frontend rows filled; handoff entry written; `docs/ai/PROMPT_LOG.md` created and started.

---

## 10. Handoff to Backend Phase 1 (Mehak)

Tell B1: seed JSON lives in `client/src/mocks/data/`; contract shapes are authoritative; mock groups to remove after B1 = `products`, `categories`.

## 11. Design plan review (what was changed and why)

The first instinct for "bold, high-end Indian jewellery" was near-black with gold/vermilion and a high-contrast serif on warm cream. That is the default look for any luxury brief, so it was replaced with a **patina-teal + gulaal-pink + haldi-yellow** system on a cool camphor-white page, a heavy sign-painter display face that natively supports Devanagari, and a single signature device (jewellery hanging from the *shirorekha*) that could only belong to this brand.
