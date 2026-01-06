# Critical Fixes Needed for Production Build

**Status:** Build currently FAILING due to TypeScript errors
**Priority:** HIGH - Must fix before deployment

---

## Blocking Build Errors (Must Fix First)

### 1. Test Setup - Global Type Conflicts (src/test/setup.ts)

**Problem:** Global type declarations conflicting with existing types

**Fix:**
```typescript
// Remove the declare global block (lines 13-20) or fix the types:
// The issue is that globalThis already has these types defined
// Solution: Use type assertion instead

// Change from:
(globalThis as any).Telegram = { ... }

// To:
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Telegram = { ... };
  (globalThis as any).IntersectionObserver = class IntersectionObserver { ... };
  (globalThis as any).ResizeObserver = class ResizeObserver { ... };
}
```

### 2. Card Component Motion Props (src/components/ui/Card.tsx)

**Problem:** Type incompatibility between HTMLDivElement props and motion.div props

**Current Workaround:** Using `as any` - not ideal but functional

**Better Fix:**
```typescript
import { HTMLMotionProps } from 'framer-motion'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'elevated' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}
```

### 3. Missing API Export (src/api/client.ts)

**Problem:** `api` not exported but imported in Auth files

**Fix:** Either export it or refactor Auth files to not use it
```typescript
// In src/api/client.ts, add:
export const api = apiClient; // if needed

// OR remove the import from AuthPage.tsx and AuthProvider.tsx
```

### 4. ConfirmDialog Prop Name (src/features/watchlist/RemoveCoinDialog.tsx)

**Problem:** Using `description` instead of `message`

**Fix:** Line 28 - change:
```typescript
// From:
<ConfirmDialog description="..." />

// To:
<ConfirmDialog message="..." />
```

### 5. Spinner Import (src/features/alerts/AlertForm/CoinSelector.tsx)

**Problem:** Default import but Spinner is a named export

**Fix:** Line 7:
```typescript
// From:
import Spinner from '@/components/ui/Spinner'

// To:
import { Spinner } from '@/components/ui/Spinner'
```

---

## Quick Cleanup Fixes (Non-Blocking but Should Fix)

### Unused Imports - Auto-fixable with ESLint

Run: `npm run lint -- --fix` to auto-remove these:

- src/features/alerts/AlertForm/AlertTypeSelector.tsx (line 2): DollarSign
- src/features/alerts/AlertForm/CoinSelector.tsx (line 3): Search
- src/features/auth/AuthGuard.tsx (line 1): useEffect
- src/features/auth/AuthProvider.tsx (lines 12, 13): tgUser, token
- src/features/history/HistoryCard.tsx (line 4): cn
- src/features/history/HistoryEmpty.tsx (line 14): Icon assignment type
- src/features/market/FearGreedGauge.tsx (line 3): cn
- src/features/profile/PlanCard.tsx (line 22): plan variable
- src/features/watchlist/CoinDetailSheet.tsx (line 3): TrendingUp
- src/pages/AuthPage.tsx (line 13): tgUser

### Null Safety - Add Guards

**src/lib/accessibility.ts** (lines 40-42, 115, 120):
```typescript
// Add null checks:
const role = element.getAttribute('role');
if (role) {
  element.setAttribute('aria-label', role);
}

// For array access:
if (lastFocusable) {
  lastFocusable.focus();
}
```

**src/pages/Market/index.tsx** (lines 232-249):
```typescript
// Add guard before using coin:
const virtualItems = virtualizer.getVirtualItems();
{virtualItems.map((virtualItem) => {
  const coin = sortedCoins[virtualItem.index];
  if (!coin) return null; // Add this guard

  return (
    <MarketCoinCard
      key={coin.id}
      coin={coin}
      // ...
    />
  );
})}
```

**src/features/history/HistoryTimeline.tsx** (lines 35, 37, 39, 41):
```typescript
// Add existence checks:
{groups.Today && <TimelineGroup label="Today" items={groups.Today} />}
{groups.Yesterday && <TimelineGroup label="Yesterday" items={groups.Yesterday} />}
{groups['This Week'] && <TimelineGroup label="This Week" items={groups['This Week']} />}
{groups.Earlier && <TimelineGroup label="Earlier" items={groups.Earlier} />}
```

---

## Type Mapping Issues

### MarketOverviewResponse vs MarketOverview

**File:** src/pages/Market/index.tsx (line 167)

**Problem:** API response has snake_case but component expects camelCase

**Fix:** Create an adapter function:
```typescript
function mapMarketOverview(response: MarketOverviewResponse): MarketOverview {
  return {
    totalMarketCap: response.total_market_cap,
    totalVolume24h: response.total_volume_24h,
    btcDominance: response.btc_dominance,
    ethDominance: response.eth_dominance,
    marketCapChange24hPct: response.market_cap_change_24h_pct,
    fearGreedIndex: response.fear_greed_index,
    topCoins: response.top_coins,
  };
}

// Then use:
<MarketOverviewCard data={mapMarketOverview(marketOverview)} />
```

### ProgressBar Type Comparison

**File:** src/components/ui/ProgressBar.tsx (line 45)

**Fix:** The comparison is intentional but TypeScript doesn't know. Add a type assertion:
```typescript
const finalVariant = getVariant();

// Later in className object:
{
  'text-tg-hint': finalVariant === 'default' as const,
}
```

---

## WebSocket NodeJS Type

**File:** src/hooks/useWebSocket.ts (line 38)

**Problem:** NodeJS.Timeout not found

**Fix:**
```typescript
// Option 1: Use ReturnType
private pingInterval: ReturnType<typeof setInterval> | null = null

// Option 2: Add @types/node to devDependencies (not recommended for browser-only code)
```

---

## Test File Issues (Non-Critical)

**File:** src/components/ui/__tests__/Button.test.tsx

**Problem:** jest-dom matchers not recognized by Vitest types

**Solution:** Tests will run fine, but TypeScript complains. Can ignore or:
```typescript
// Add to src/test/setup.ts:
import '@testing-library/jest-dom/vitest'

// Or add custom type declarations in a .d.ts file
```

---

## Immediate Action Plan

### Step 1: Fix Build Blockers (30 minutes)
1. Fix test/setup.ts global declarations
2. Fix Spinner import in CoinSelector
3. Remove/export `api` from client.ts
4. Fix RemoveCoinDialog message prop
5. Re-run build

### Step 2: Cleanup Warnings (15 minutes)
1. Run ESLint auto-fix for unused imports
2. Add null guards in Market page and HistoryTimeline
3. Fix accessibility.ts null checks

### Step 3: Type Mappers (15 minutes)
1. Create MarketOverview adapter function
2. Test Market page with real data

### Step 4: Verify (10 minutes)
1. Run `npm run build` - should succeed
2. Run `npm run lint` - should pass
3. Run `npm test` - should pass
4. Manual smoke test in dev mode

---

## Expected Results After Fixes

- **TypeScript Errors:** 0 (down from 60+)
- **Build:** SUCCESS
- **Lint:** All warnings resolved
- **Tests:** All passing (test matchers warnings can be ignored)

---

## Files Modified in This QA Audit

Total: 22 files modified, 1 file created

### Created:
- `src/vite-env.d.ts`
- `QA_AUDIT_REPORT.md` (this document's parent)
- `CRITICAL_FIXES_NEEDED.md` (this document)

### Modified:
1. src/test/setup.ts
2. src/test/utils.tsx
3. src/components/ui/Button.tsx
4. src/components/ui/Card.tsx
5. src/components/ui/Badge.tsx
6. src/components/ui/Toast.tsx
7. src/components/ui/__tests__/Button.test.tsx
8. src/components/common/PageHeader.tsx
9. src/components/common/ConfirmDialog.tsx
10. src/components/common/Sparkline.tsx
11. src/types/index.ts
12. src/api/client.ts
13. src/api/websocket.ts
14. src/api/alerts.ts
15. src/api/watchlist.ts
16. src/api/index.ts
17. src/pages/Watchlist/index.tsx
18. src/pages/Watchlist/AddCoin.tsx
19. src/pages/Market/index.tsx
20. src/pages/Alerts/index.tsx
21. src/pages/Profile/Subscription.tsx

---

**Last Updated:** 2026-01-04
**Estimated Time to Complete Remaining Fixes:** 60-70 minutes
