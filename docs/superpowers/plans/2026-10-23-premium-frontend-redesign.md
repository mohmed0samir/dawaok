# Dawaok Premium Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all four Dawaok pages (index, admin, delivery, invoice) with a premium, original visual identity using the existing design system at `design-system/dawaok/`, replacing AI-generic and emoji-heavy UI with an RTL-first pharmacy aesthetic while preserving all Firebase integrations, cart logic, and order flow.

**Architecture:** Vanilla HTML/CSS/JS (no framework). Four page rewrites + four CSS rewrites. Each page keeps its existing JS module intact (Firebase auth/Firestore, cart in localStorage, prescription upload via Telegram API). CSS files are rewritten to match the design system token palette (Noto Naskh Arabic + Noto Sans Arabic, primary #15803D green, accent #0369A1 blue, background #F0FDF4). HTML is rewritten to remove all emojis and replace with SVG icons, adopt RTL layout, shelf-motif product cards, and page-specific overrides from `design-system/dawaok/pages/`.

**Tech Stack:** Vanilla HTML/CSS/JS, Firebase modular SDK v10.12.2 (app.js/invoice.js) + compat SDK (admin.js), Google Fonts (Noto Naskh Arabic, Noto Sans Arabic), SVG icons inline, localStorage cart.

**Spec:** `design-system/dawaok/MASTER.md` + `design-system/dawaok/pages/{index,admin,delivery,invoice}.md`

## Global Constraints

- No emojis as icons — replace all emoji usage with inline SVG icons (consistent icon set).
- All clickable elements must have `cursor:pointer`.
- Hover states with smooth transitions (150-300ms).
- Light mode text contrast 4.5:1 minimum.
- Focus states visible for keyboard navigation.
- `prefers-reduced-motion` respected.
- Responsive breakpoints: 375px, 768px, 1024px, 1440px.
- No content hidden behind fixed navbars.
- No horizontal scroll on mobile.
- Arabic RTL (`dir="rtl"`, `lang="ar"`) on all pages.
- Primary #15803D, Secondary #22C55E, Accent #0369A1, Background #F0FDF4, Card #FFFFFF, Border #BBF7D0.
- Typography: Noto Naskh Arabic headings, Noto Sans Arabic body.
- All existing Firebase integrations, cart logic, order flow, and prescription upload must continue working unchanged.
- No framework, no build step.

## Review Focus

- Emoji removal completeness — every emoji in index.html, admin.html, delivery.html, invoice.html must be replaced with SVG.
- RTL mirroring — flex directions, text alignments, margins/paddings, scroll directions must all mirror correctly for Arabic.
- Contrast — verify #14532D foreground on #F0FDF4 background meets 4.5:1; verify primary #15803D on white passes.
- Focus rings — 3px #15803D20 focus rings on all interactive inputs/buttons.
- Firebase integration preserved — no JS logic changes, only HTML/CSS changes; class names referenced by JS (e.g. `cartBadge`, `productsGrid`, `cartItems`, `rxPreview`, `toast`) must remain.
- Touch targets minimum 44×44px on delivery page especially.
- Print mode for invoice — `@page { size: A4; margin: 15mm; }`, hide non-essential chrome.

---
### Task 1: Rewrite css/style.css — premium design system tokens + base layout

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: design tokens from `design-system/dawaok/MASTER.md` (colors, typography, spacing, shadows).
- Produces: CSS custom properties `--color-*`, `--space-*`, `--shadow-*` and base component classes (`.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.modal`, `.chip`) used by index.html.

- [ ] **Step 1: Write CSS variables and reset** in `css/style.css`
  - Define `--color-primary: #15803D`, `--color-on-primary: #FFFFFF`, `--color-secondary: #22C55E`, `--color-accent: #0369A1`, `--color-background: #F0FDF4`, `--color-foreground: #14532D`, `--color-card: #FFFFFF`, `--color-card-foreground: #14532D`, `--color-muted: #E8F0F1`, `--color-muted-foreground: #475569`, `--color-border: #BBF7D0`, `--color-destructive: #DC2626`, `--color-ring: #15803D`.
  - Define `--space-xs` through `--space-3xl`, `--shadow-sm` through `--shadow-xl`.
  - Import Noto Naskh Arabic + Noto Sans Arabic from Google Fonts.
  - `body { font-family: 'Noto Sans Arabic'; direction: rtl; background: var(--color-background); color: var(--color-foreground); }`
- [ ] **Step 2: Write base component classes** — `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.modal-overlay`, `.modal`, `.chip`, `.toast`, `.skeleton` with flat design, 150-200ms transitions, focus rings.
- [ ] **Step 3: Verify no leftover Tajawal references or emoji styles** — remove all Tajawal font stacks, remove emoji-specific sizing/positioning.
- [ ] **Step 4: Commit** — `git add css/style.css; git commit -m "style: premium design system tokens and base components"`

---
### Task 2: Redesign index.html — premium store page with shelf motif

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: CSS classes from `css/style.css` (Task 1).
- Produces: HTML structure matching `design-system/dawaok/pages/index.md` — header with SVG icons, hero with shelf CSS grid illustration, category chips, product grid with shelf-motif cards, cart drawer, account drawer, Rx modal, location picker.

- [ ] **Step 1: Replace header** — logo with SVG mark (no emoji), search with SVG search icon, Rx FAB and cart FAB with SVG icons, all with `cursor:pointer`. Keep all JS-referenced IDs (`searchInput`, `accountBtn`, `cartBadge`, `rx-fab`, `cart-fab`).
- [ ] **Step 2: Replace hero** — remove emoji background, add CSS grid shelf illustration behind headline, headline "صيدليتك في جيبك", subhead "أدويتك وروشتتك حتى باب البيت", primary + secondary CTAs. Keep smooth-scroll behavior to products section.
- [ ] **Step 3: Replace categories** — horizontal scroll chips with SVG category icons (no emoji), chip active state uses primary background.
- [ ] **Step 4: Replace product grid** — product cards look like medicine boxes on a shelf (white card, 1px #BBF7D0 border, accent strip on left edge, product name as box label), hover lift translateY(-2px), border shifts to primary. Keep `product-card`, `product-img`, `product-badge`, `product-body`, `product-name`, `product-price`, `add-btn` classes referenced by JS.
- [ ] **Step 5: Replace cart drawer** — RTL layout, SVG icons for items/remove/qty controls, form with focus rings, map picker button, checkout button.
- [ ] **Step 6: Replace account drawer** — auth tabs, login/register forms, profile section, address list, address form, logout/delete buttons — all with SVG icons, flat design.
- [ ] **Step 7: Replace Rx modal** — prescription upload drop zone with SVG camera/document icons, preview, customer form, submit button. Keep `rxDrop`, `rxInput`, `rxPreview`, `rxPreviewWrap`, `rxPlaceholder` IDs.
- [ ] **Step 8: Replace location picker modal** — map preview, current location button, external Google Maps link, all SVG icons.
- [ ] **Step 9: Replace toast** — centered bottom toast with SVG check/cross icon, slide-in animation respecting prefers-reduced-motion.
- [ ] **Step 10: Remove all emoji characters** from index.html (✚, 🔍, 📷, 👤, 🛒, 🌿, 🏠, 💊, 🌿, 🧴, 👶, 🩺, 💪, 🔖, 🛒, ✕, ⏳, 🔍, 📦, 👤, 📦, 🧾, 📍, 📤, ✅, ✨, 🔐, ✌️, 📍, 🗑, 🚪, 🧾).
- [ ] **Step 11: Commit** — `git add index.html; git commit -m "feat(index): premium redesign with shelf motif"`

---
### Task 3: Rewrite css/admin.css — premium design system for admin panel

**Files:**
- Modify: `css/admin.css`

**Interfaces:**
- Consumes: design tokens from MASTER.md + admin page override (`pages/admin.md`).
- Produces: admin-specific CSS — sidebar (right edge accent strip), stats cards, tables, status chips, forms, modals, image upload, emoji picker replacement.

- [ ] **Step 1: CSS variables** — admin palette derived from design system tokens.
- [ ] **Step 2: Sidebar** — white background, right border #BBF7D0, active nav item with #F0FDF4 background + #15803D text + 3px right border, SVG nav icons (no emoji).
- [ ] **Step 3: Stats grid** — 4 cards, white with border, value in primary #15803D, large typography.
- [ ] **Step 4: Tables** — flat design, white cards, 1px borders, hover row tint #F0FDF4, no zebra stripes.
- [ ] **Step 5: Status chips** — pending amber, confirmed/priced green, delivered green, cancelled red — flat pill badges.
- [ ] **Step 6: Forms** — inputs with 1px border, focus ring 3px #15803D20, labels in muted foreground.
- [ ] **Step 7: Modals** — white, border-radius 16px, overlay backdrop blur.
- [ ] **Step 8: Remove all Tajawal font stacks and emoji styles.**
- [ ] **Step 9: Commit** — `git add css/admin.css; git commit -m "style(admin): premium design system rewrite"`

---
### Task 4: Redesign admin.html — premium admin panel

**Files:**
- Modify: `admin.html`

**Interfaces:**
- Consumes: CSS classes from `css/admin.css` (Task 3), JS from `js/admin.js` (unchanged).
- Produces: admin HTML matching `pages/admin.md` — login screen, sidebar (right side), topbar, dashboard stats, orders table, products list, add product form, couriers management, modals.

- [ ] **Step 1: Replace login screen** — centered card, brand with SVG mark, email/password fields, login button — no emoji.
- [ ] **Step 2: Replace sidebar** — right-side (RTL), nav items with SVG icons, active state with primary accent strip right edge, footer with online indicator and logout.
- [ ] **Step 3: Replace topbar** — menu button, title, live badge.
- [ ] **Step 4: Replace dashboard** — stats grid (4 cards), recent orders table, seed/products buttons.
- [ ] **Step 5: Replace orders page** — filter chips, orders table with status chips, action buttons per row.
- [ ] **Step 6: Replace products page** — product list rows with thumbnail, name, meta, stock chip, delete button.
- [ ] **Step 7: Replace add product page** — form grid, image drop zone with SVG, category select, price/stock/discount fields, add product button. Keep all JS-referenced IDs (`pName`, `pBrand`, `pCat`, `pPrice`, `pStock`, `pDiscount`, `imgDrop`, `imgInput`, `imgPreview`, `pEmoji`, `pNew`).
- [ ] **Step 8: Replace couriers page** — courier creation form, courier list.
- [ ] **Step 9: Replace all modals** — change password, clear orders, Rx pricing, Rx view, courier credentials — SVG icons, flat design.
- [ ] **Step 10: Remove all emoji characters** from admin.html (✚, 📊, 📦, 💊, ➕, 🚚, 🏪, 🔑, 🚪, 🗑, 🌱, 🧾, ✅, ❌, ➕, 🔍).
- [ ] **Step 11: Commit** — `git add admin.html; git commit -m "feat(admin): premium redesign"`

---
### Task 5: Rewrite css/delivery.css — premium design system for courier portal

**Files:**
- Modify: `css/delivery.css`

**Interfaces:**
- Consumes: design tokens + `pages/delivery.md` override.
- Produces: delivery CSS — mobile-first stacked layout, green header band, large touch targets, order cards as delivery manifests.

- [ ] **Step 1: CSS variables** — delivery palette from design system tokens.
- [ ] **Step 2: Shell/layout** — max-width 900px centered, mobile-first, padding.
- [ ] **Step 3: Header band** — primary #15803D background, white text, brand + home link.
- [ ] **Step 4: Intro section** — green gradient background, large typography, SVG truck icon.
- [ ] **Step 5: Login card** — centered, white, border, large fields, login button 44px+ touch target.
- [ ] **Step 6: Toolbar** — courier name, orders count, logout button.
- [ ] **Step 7: Order cards** — white card, border #BBF7D0, shadow md, customer info, items, total, map link, accept/next-step buttons (large touch targets).
- [ ] **Step 8: Status pills** — primary tint background, primary text.
- [ ] **Step 9: Toast** — bottom center, slide-in.
- [ ] **Step 10: Remove Tajawal and emoji styles.**
- [ ] **Step 11: Commit** — `git add css/delivery.css; git commit -m "style(delivery): premium design system rewrite"`

---
### Task 6: Redesign delivery.html — premium courier portal

**Files:**
- Modify: `delivery.html`

**Interfaces:**
- Consumes: CSS from `css/delivery.css` (Task 5), JS from `js/delivery.js` (unchanged).
- Produces: delivery HTML matching `pages/delivery.md` — header band, hero, login card, toolbar, order cards, map links.

- [ ] **Step 1: Replace header** — green band, SVG brand mark, "الموقع العام" link.
- [ ] **Step 2: Replace intro** — green gradient, SVG icon, "بوابة التوصيل" heading, sub text.
- [ ] **Step 3: Replace login card** — email/password fields, login button — SVG icons only.
- [ ] **Step 4: Replace delivery app** — toolbar with courier name + count + logout, order cards stacked.
- [ ] **Step 5: Replace order card markup** — customer name/phone/address, items list, money total, map link (accent #0369A1), accept/move buttons (large, primary background).
- [ ] **Step 6: Replace toast** — bottom center slide-in.
- [ ] **Step 7: Remove all emoji characters** (🚚, 🗺️, ✅, 📦, 🛵, 📱, 📍).
- [ ] **Step 8: Commit** — `git add delivery.html; git commit -m "feat(delivery): premium redesign"`

---
### Task 7: Rewrite css/invoice.css — premium design system for invoice page

**Files:**
- Modify: `css/invoice.css`

**Interfaces:**
- Consumes: design tokens + `pages/invoice.md` override.
- Produces: invoice CSS — print-optimized, header band, invoice body, progress track, totals, payment box.

- [ ] **Step 1: CSS variables** — invoice palette from design system tokens.
- [ ] **Step 2: Topbar** — brand, action buttons (site link, print).
- [ ] **Step 3: Success banner** — green tint background, SVG icon, headline.
- [ ] **Step 4: Rx box** — prescription image preview, border, open link.
- [ ] **Step 5: Invoice white card** — header band (primary #15803D), brand name large, order ID badge, meta grid, items table, totals, payment box, progress track, footer.
- [ ] **Step 6: Print media queries** — `@page { size: A4; margin: 15mm; }`, hide topbar/banner/action buttons, `-webkit-print-color-adjust: exact` for brand colors.
- [ ] **Step 7: Remove Tajawal and emoji styles.**
- [ ] **Step 8: Commit** — `git add css/invoice.css; git commit -m "style(invoice): premium design system rewrite"`

---
### Task 8: Redesign invoice.html — premium invoice page

**Files:**
- Modify: `invoice.html`

**Interfaces:**
- Consumes: CSS from `css/invoice.css` (Task 7), JS from `js/invoice.js` (unchanged).
- Produces: invoice HTML matching `pages/invoice.md` — topbar, success banner, Rx preview, invoice card, print-ready.

- [ ] **Step 1: Replace topbar** — SVG brand, site link, print button — no emoji.
- [ ] **Step 2: Replace success banner** — green tint, SVG icon, dynamic message based on order status.
- [ ] **Step 3: Replace Rx box** — prescription image section, open link.
- [ ] **Step 4: Replace invoice card** — header band with brand + order ID, meta (customer + details), items table, totals, payment status, progress track, footer.
- [ ] **Step 5: Replace center-state loading/not-found** — SVG icons, centered layout.
- [ ] **Step 6: Remove all emoji characters** (✚, ⏳, 🏪, ⬇️, 🧾, 🎉, 📋, ✓).
- [ ] **Step 7: Commit** — `git add invoice.html; git commit -m "feat(invoice): premium redesign"`

---
### Task 9: Test functionality and visual consistency

**Files:**
- Test: all 4 HTML files + 4 CSS files + JS modules (unchanged)

**Interfaces:**
- Consumes: all redesigned pages and stylesheets.
- Produces: verified working frontend with preserved functionality.

- [ ] **Step 1: Verify all emoji removed** — grep for emoji characters across index.html, admin.html, delivery.html, invoice.html, css/*.css. Zero matches expected.
- [ ] **Step 2: Verify JS class/ID references intact** — grep JS files for DOM IDs/classes they reference (cartBadge, productsGrid, cartItems, rxDrop, rxInput, rxPreview, toast, pName, etc.) and confirm they exist in redesigned HTML.
- [ ] **Step 3: Verify RTL layout** — check `dir="rtl"` on all pages, text-align right, flex-direction row-reverse where needed, margins mirrored.
- [ ] **Step 4: Verify contrast** — check #14532D on #F0FDF4 ≥ 4.5:1, primary #15803D on white passes, status chips readable.
- [ ] **Step 5: Verify focus rings** — 3px #15803D20 on focused inputs/buttons.
- [ ] **Step 6: Verify responsive breakpoints** — 375px, 768px, 1024px, 1440px — no horizontal scroll, no content hidden behind fixed navbars.
- [ ] **Step 7: Verify cursor:pointer** — on all clickable elements (buttons, links, chips, cards).
- [ ] **Step 8: Verify transitions** — 150-300ms on hover states, no instant state changes.
- [ ] **Step 9: Verify print mode for invoice** — `@page` A4, hidden chrome, brand colors preserved.
- [ ] **Step 10: Verify Firebase integration unchanged** — no modifications to js/app.js, js/admin.js, js/delivery.js, js/invoice.js, js/firebase-config.js, js/firebase-config-compat.js.
- [ ] **Step 11: Commit** — `git add -A; git commit -m "test: verify redesign consistency and functionality"`

---
### Task 10: Commit to branch design/dawauk-premium-redesign and push to GitHub

**Files:**
- Modify: git branch, remote

**Interfaces:**
- Consumes: all completed redesign commits.
- Produces: branch `design/dawauk-premium-redesign` pushed to origin.

- [ ] **Step 1: Create branch** — `git checkout -b design/dawauk-premium-redesign` (or switch if exists).
- [ ] **Step 2: Push branch** — `git push -u origin design/dawauk-premium-redesign`.
- [ ] **Step 3: Commit** — N/A (this is a git operation step).

---
### Task 11: Create PR on GitHub

**Files:**
- Modify: GitHub PR

**Interfaces:**
- Consumes: pushed branch `design/dawauk-premium-redesign`.
- Produces: open pull request against default branch.

- [ ] **Step 1: Create PR** — via `gh pr create` with title "Frontend: premium redesign" and body describing changes, ending with 🤖 Generated with Claude Code attribution.
- [ ] **Step 2: Verify PR** — check `gh pr status` or `mcp__ccd_pr__get_status` for mergeability and CI.

---
### Task 12: Create FRONTEND_REDESIGN_REPORT.md documentation

**Files:**
- Create: `FRONTEND_REDESIGN_REPORT.md`

**Interfaces:**
- Consumes: all redesign work, PR link.
- Produces: documentation of the redesign decisions, design system applied, pages changed, testing performed.

- [ ] **Step 1: Write report** — sections: overview, design system applied, page-by-page changes, technical decisions, testing checklist, PR link, known limitations.
- [ ] **Step 2: Commit** — `git add FRONTEND_REDESIGN_REPORT.md; git commit -m "docs: add frontend redesign report"`.

---

## Self-Review

1. **Spec coverage:** Every page (index, admin, delivery, invoice) has a corresponding redesign task. CSS rewrites match each page. Design system overrides are referenced. Testing, commit, push, PR, and report are all covered.

2. **Step scan:** Each step is unambiguous — exact file paths, exact CSS values, exact HTML element changes. No step says "TBD" or "handle edge cases."

3. **Type consistency:** JS-referenced IDs are preserved in Tasks 2, 4, 6, 8. CSS class names referenced by JS (`.product-card`, `.cart-item`, `.btn-checkout`, `.chip`, `.stat`, etc.) are preserved.

4. **Review Focus:** Emoji removal, RTL mirroring, contrast, focus rings, touch targets, Firebase integration preservation, print mode — all addressed in Task 9 steps.

5. **Proportion:** Plan is approximately 2x the spec size, which is appropriate given 12 tasks spanning 4 pages × (HTML + CSS) + testing + git + PR + docs.