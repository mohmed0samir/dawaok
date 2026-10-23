# Dawaok (دواؤك) — Principal Engineer Audit Report

**Repository:** https://github.com/mohmed0samir/dawaok.git  
**Branch:** `fix/dawauk-audit-improvements`  
**Audit date:** 2026-10-23  
**Platform:** Arabic RTL e-commerce/pharmacy (Firebase backend)

---

## 1. Executive Summary

A full principal-engineer audit of the Dawaok codebase was completed. The audit covered:

- **4 bugs found and fixed** across `js/app.js`, `js/delivery.js`, `js/admin.js`
- **1 missing security file created** (`storage.rules`)
- **6 pure functions extracted** into testable modules (`js/utils.js`, `js/admin-utils.js`)
- **41 Vitest tests written and passing** (100% pass rate)
- **Security review** of Firestore/Storage rules — no secrets in code, no public rules

All fixes are committed to branch `fix/dawauk-audit-improvements` and ready for push/PR.

---

## 2. Bugs Found & Fixes Applied

### Bug 1 — Rx image size error message mismatch (js/app.js)

**Root cause:** The prescription image size check allowed up to 14 MB, but the user-facing error message said "10 MB".

**Fix:** Changed the error message from "10MB" to "14MB" to match the actual limit.

**Evidence:** `js/app.js` — the `submitRxOrder` function checks `file.size > 14 * 1024 * 1024` but displayed "يجب ألا تتجاوز الصورة 10 ميجابايت".

### Bug 2 — paymentCollected overwritten on non-delivered status (js/delivery.js)

**Root cause:** `moveOrder()` unconditionally set `paymentCollected: status === 'delivered' ? true : false`, which reset `paymentCollected` to `false` whenever a courier moved an order to any non-delivered status (e.g., `picked_up` → `out_for_delivery`), wiping out a previously collected payment flag.

**Fix:** Changed to only set `paymentCollected: true` when status is `delivered`, leaving it untouched otherwise:

```js
const updates = { status, updatedAt: serverTimestamp(), ...(status === 'delivered' ? { paymentCollected: true } : {}) };
```

**Evidence:** `js/delivery.js:81` — original `paymentCollected: status==='delivered'?true:false` replaced with conditional spread.

### Bug 3 — No input validation in addProduct() (js/admin.js)

**Root cause:** `addProduct()` had no validation for price, stock, or discount fields. Negative prices, negative stock, and discounts > 100% could be written to Firestore.

**Fix:** Added validation:
- Price must be ≥ 0
- Stock must be ≥ 0
- Discount must be between 0 and 90

**Evidence:** `js/admin.js:633-645` — validation checks added before Firestore write.

### Bug 4 — Nested function declarations inside doLogin() try block (js/admin.js)

**Root cause:** `requestBrowserNotifications` and `notifyBrowser` were declared inside `doLogin()`'s `try` block / `if` block, making them function-scoped and unavailable elsewhere. This also caused potential issues with hoisting and testability.

**Fix:** Moved both function declarations to module level (top of file, after imports).

**Evidence:** `js/admin.js:15-21` — `requestBrowserNotifications` and `notifyBrowser` now at module level.

---

## 3. Missing Security File Created

### storage.rules (created)

**Problem:** `firebase.json` referenced `storage.rules` but the file did not exist. The app does not use Firebase Storage (prescription images go via base64 to a Telegram bot API route), so Storage should be locked down entirely.

**Fix:** Created `storage.rules` that denies all read/write:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Evidence:** New file `storage.rules` — denies all access; `firebase.json` already references it.

---

## 4. Code Quality Improvements

### Pure function extraction (TDD-ready)

Six pure functions were extracted from Firebase/DOM-coupled files into standalone, testable modules:

| Module | Function | Source | Purpose |
|--------|----------|--------|---------|
| `js/utils.js` | `formatAddr(a)` | `js/app.js` | Formats address object to Arabic string |
| `js/utils.js` | `statusLabel(s, order)` | `js/app.js` | Returns Arabic status label with courier info |
| `js/utils.js` | `translateAuthErr(e)` | `js/app.js` | Translates Firebase auth error codes to Arabic |
| `js/admin-utils.js` | `courierEmailBase(name)` | `js/admin.js` | Converts Arabic courier name to email base |
| `js/admin-utils.js` | `normalizeProductName(name)` | `js/admin.js` | Normalizes Arabic product name for lookup |
| `js/admin-utils.js` | `productSellingPrice(product)` | `js/admin.js` | Computes selling price with discount |

`js/utils.js` is imported by `js/app.js` via ES module. `js/admin-utils.js` is loaded as `<script type="module">` in `admin.html` and also assigns functions to `window` for `admin.js` (compat SDK script tag).

### Dead code path documented

`placeOrder()` in `app.js` requires authentication (`currentUser` check), but Firestore rules and `claimGuestOrders()` support `userId=null`. Guest orders cannot be placed through the UI — this is a documented inconsistency, not a bug to fix (guest ordering would require UI changes).

---

## 5. Security Review

### Firestore rules (`firestore.rules`)

- **Products:** Public read, admin-only create/delete, courier stock update only
- **Orders:** Create requires `auth.uid` matching `userId`; read restricted to admin/owner/courier; update restricted; admin delete
- **Users:** Self read/write; admin all
- **Addresses subcollection:** Self read/write only
- **Verdict:** No public write access; role-based access control properly implemented

### Storage rules (`storage.rules`)

- All read/write denied (app does not use Firebase Storage)
- **Verdict:** Locked down

### Secrets check

- Firebase API key in `js/firebase-config.js` — standard for Firebase client SDK, not a secret
- No API keys, passwords, or tokens hardcoded in source
- Telegram bot credentials (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) are environment variables on Vercel, not in code
- Firebase Admin service account is `FIREBASE_SERVICE_ACCOUNT_JSON` env var, not in code
- **Verdict:** No secrets in code

### Courier password handling

- New courier passwords are generated server-side and returned in API response (by design — admin needs to share with courier)
- Passwords are not logged or stored in plaintext beyond the initial creation
- **Verdict:** Acceptable by design, documented for admin awareness

---

## 6. Testing

### Test infrastructure

- **Framework:** Vitest 5.0.5
- **Config:** `"test": "vitest run"` in `package.json`
- **Test files:** `js/utils.test.js`, `js/admin-utils.test.js`

### Test results

| File | Tests | Passed | Failed |
|------|-------|--------|--------|
| `js/utils.test.js` | 25 | 25 | 0 |
| `js/admin-utils.test.js` | 16 | 16 | 0 |
| **Total** | **41** | **41** | **0** |

### Coverage

All six extracted pure functions are tested with:
- Happy path cases
- Edge cases (empty strings, missing fields, zero values)
- Error cases (unknown status codes, invalid inputs)
- Arabic-specific normalization (alef forms, ta marbuta)

---

## 7. Files Changed

| File | Change |
|------|--------|
| `js/app.js` | Removed inline `formatAddr`, `statusLabel`, `translateAuthErr`; added import from `./utils.js`; fixed Rx image error message |
| `js/delivery.js` | Fixed `paymentCollected` overwrite bug in `moveOrder()` |
| `js/admin.js` | Removed inline `courierEmailBase`, `normalizeProductName`, `productSellingPrice`; moved `requestBrowserNotifications`/`notifyBrowser` to module level; added `addProduct()` validation |
| `js/utils.js` | **Created** — extracted pure functions from app.js |
| `js/admin-utils.js` | **Created** — extracted pure functions from admin.js |
| `js/utils.test.js` | **Created** — 25 tests for utils.js functions |
| `js/admin-utils.test.js` | **Created** — 16 tests for admin-utils.js functions |
| `storage.rules` | **Created** — deny-all Firebase Storage rules |
| `package.json` | Added `"test": "vitest run"` script and `vitest` devDependency |
| `admin.html` | Added `<script type="module" src="js/admin-utils.js"></script>` |

---

## 8. Pending Work

The following items from the original mission remain:

1. **Push changes to GitHub** — Branch `fix/dawauk-audit-improvements` is ready but not yet pushed
2. **Create Pull Request** — Not yet created (pending push)
3. **Production deployment verification** — Tests pass locally; production deploy on Vercel not yet verified

---

## 9. Test Command

```bash
cd /path/to/dawaok-audit
npm test
# or: ./node_modules/.bin/vitest run
```

Expected output: 41 tests passing across 2 files, 0 failures.

---

**Attribution:** Co-Authored-By: Claude Code <noreply@anthropic.com>
