# Refactor Reference: Large Files in `app/`

## 📋 Large Files Identified

### 1. `app/page.tsx`
- **20KB, 501 lines**
- The largest file in the app directory. Likely contains a lot of logic/UI that could be modularized.

### 2. `app/api/chat/route.ts`
- **17KB, 347 lines**
- Large API route handler. Could benefit from splitting into smaller functions or modules (validation, business logic, response formatting).

### 3. `app/vocab/VocabRow.tsx`
- **13KB, 351 lines**
- Large component. Could be split into smaller subcomponents or hooks.

### 4. `app/review/SRSReview.tsx`
- **11KB, 282 lines**
- Large React component. Could be modularized for maintainability.

### 5. `app/speak/page.tsx`
- **5.1KB, 143 lines** (after refactor, now much smaller)
- No longer a concern, but worth noting for completeness.

### 6. `app/grammar/page.tsx`
- **5.4KB, 140 lines**
- Not as large, but could be reviewed for modularity if it contains complex logic.

---

## 🛠️ Suggested Next Steps
- **Start with `app/page.tsx`**: The largest and likely most complex. Extract major sections into components and move logic into hooks.
- **API Route (`app/api/chat/route.ts`)**: Split business logic, validation, and response handling into separate modules.
- **Component Files (`VocabRow.tsx`, `SRSReview.tsx`)**: Break down into smaller components and custom hooks.

---

_This file is a living reference for future refactoring work. Update as you modularize or identify new large files._ 