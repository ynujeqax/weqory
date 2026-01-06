# Component Usage Guide

Quick reference for using Weqory UI components.

## UI Components

### Button

```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="lg" onClick={handleClick}>
  Create Alert
</Button>

// Variants: primary, secondary, danger, ghost
// Sizes: sm, md, lg
// Props: loading, disabled, fullWidth
```

### Badge

```tsx
import { Badge } from '@/components/ui'

<Badge variant="success">Active</Badge>
<Badge variant="warning" size="sm">Beta</Badge>

// Variants: default, success, warning, danger, neutral
// Sizes: sm, md
```

### Modal

```tsx
import { Modal } from '@/components/ui'

const [isOpen, setIsOpen] = useState(false)

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Edit Alert"
>
  <div className="space-y-4">
    {/* Modal content */}
  </div>
</Modal>
```

### Sheet (Bottom Drawer)

```tsx
import { Sheet } from '@/components/ui'

<Sheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Coin Details"
>
  {/* Sheet content */}
</Sheet>
```

### Toast

```tsx
import { toast } from '@/components/ui'

// Success
toast.success('Alert created successfully!')

// Error
toast.error('Failed to create alert')

// Warning
toast.warning('You have reached 90% of your limit')

// Info
toast.info('Prices are updating...')

// Custom duration (ms)
toast.success('Saved!', 2000)
```

### Skeleton Loading

```tsx
import { Skeleton, CoinSkeleton, AlertSkeleton } from '@/components/ui'

// Generic skeleton
<Skeleton className="w-full h-20" />

// Pre-built skeletons
<CoinSkeleton />
<AlertSkeleton />
<ChartSkeleton />
```

### Select

```tsx
import { Select, type SelectOption } from '@/components/ui'

const options: SelectOption[] = [
  { value: 'btc', label: 'Bitcoin' },
  { value: 'eth', label: 'Ethereum' },
  { value: 'sol', label: 'Solana', disabled: true },
]

<Select
  value={selected}
  onChange={setSelected}
  options={options}
  placeholder="Select coin..."
/>
```

### SearchBar

```tsx
import { SearchBar } from '@/components/ui'

<SearchBar
  value={search}
  onChange={setSearch}
  placeholder="Search coins..."
  debounceMs={300}
/>
```

### Tabs

```tsx
import { Tabs, type Tab } from '@/components/ui'

const tabs: Tab[] = [
  { id: 'active', label: 'Active', count: 5 },
  { id: 'paused', label: 'Paused', count: 2 },
  { id: 'all', label: 'All', count: 7 },
]

<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### ProgressBar

```tsx
import { ProgressBar } from '@/components/ui'

// With limit
<ProgressBar current={45} max={100} />

// Unlimited
<ProgressBar current={120} max={null} />

// Custom variant
<ProgressBar current={95} max={100} variant="danger" />
```

### Divider

```tsx
import { Divider } from '@/components/ui'

// Horizontal
<Divider />

// With label
<Divider label="or" />

// Vertical
<Divider orientation="vertical" />
```

## Common Components

### CoinLogo

```tsx
import { CoinLogo } from '@/components/common'

<CoinLogo
  symbol="BTC"
  name="Bitcoin"
  size="lg"
/>

// Sizes: sm (32px), md (40px), lg (48px)
// Auto-fallback to first letter if image fails
```

### PriceDisplay

```tsx
import { PriceDisplay } from '@/components/common'

<PriceDisplay
  price={42000}
  change24h={5.2}
  size="md"
  showIcon={true}
/>

// Sizes: sm, md, lg
// Automatically colors based on positive/negative change
```

### Sparkline

```tsx
import { Sparkline } from '@/components/common'

const priceHistory = [100, 102, 98, 105, 103, 108, 110]

<Sparkline
  data={priceHistory}
  width={80}
  height={24}
/>

// Auto-scales to fit data
// Green for upward trend, red for downward
```

### ConfirmDialog

```tsx
import { ConfirmDialog } from '@/components/common'

<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Alert"
  message="Are you sure you want to delete this alert? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
  isLoading={isDeleting}
/>

// Variants: default, warning, danger
```

### ErrorBoundary

```tsx
import { ErrorBoundary } from '@/components/common'

// Wrap entire app or specific sections
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary fallback={<CustomErrorUI />}>
  <FeatureComponent />
</ErrorBoundary>
```

## Hooks

### usePriceStream (WebSocket)

```tsx
import { usePriceStream } from '@/hooks/usePriceStream'

const symbols = ['BTCUSDT', 'ETHUSDT']
const { isConnected, subscribe, unsubscribe } = usePriceStream(symbols)

// Subscribe to additional symbols
subscribe(['SOLUSDT'])

// Unsubscribe
unsubscribe(['SOLUSDT'])

// Access prices from store
import { usePricesStore } from '@/stores/pricesStore'
const { prices, getPrice } = usePricesStore()
const btcPrice = getPrice('BTCUSDT')
```

### usePWA (Install Prompt)

```tsx
import { usePWA } from '@/hooks/usePWA'

const { isInstallable, isInstalled, install } = usePWA()

{isInstallable && (
  <Button onClick={install}>
    Add to Home Screen
  </Button>
)}
```

### useTelegram

```tsx
import { useTelegram } from '@/hooks/useTelegram'

const {
  webApp,
  user,
  initData,
  hapticFeedback,
  showConfirm,
  showAlert,
} = useTelegram()

// Haptic feedback
hapticFeedback('success')  // success, error, warning
hapticFeedback('medium')   // light, medium, heavy
hapticFeedback('selection')

// Dialogs
const confirmed = await showConfirm('Delete this item?')
if (confirmed) {
  // User confirmed
}

await showAlert('Operation completed!')
```

## Stores

### useAuthStore

```tsx
import { useAuthStore } from '@/stores/authStore'

const {
  user,
  limits,
  isAuthenticated,
  setUser,
  logout,
  updateSettings,
} = useAuthStore()

// Update user settings
updateSettings({
  notificationsEnabled: true,
  vibrationEnabled: false,
})
```

### usePricesStore

```tsx
import { usePricesStore } from '@/stores/pricesStore'

const {
  prices,
  isConnected,
  getPrice,
  updatePrice,
} = usePricesStore()

// Get specific price
const btcPrice = getPrice('BTCUSDT')

// All prices
prices.forEach((price, symbol) => {
  console.log(symbol, price.price)
})
```

## Utilities

### Formatting

```tsx
import {
  formatPrice,
  formatPercentage,
  formatLargeNumber,
  formatRelativeTime,
  formatDate,
} from '@/lib/utils'

formatPrice(42000)              // "$42,000.00"
formatPrice(0.000123, 6)        // "$0.000123"

formatPercentage(5.2)           // "+5.20%"
formatPercentage(-3.1)          // "-3.10%"

formatLargeNumber(1500000000)   // "$1.50B"
formatLargeNumber(42000000)     // "$42.00M"

formatRelativeTime(new Date())  // "Just now"
formatRelativeTime(yesterday)   // "Yesterday"

formatDate(new Date())          // "Jan 4, 02:30 PM"
```

### Styling

```tsx
import { cn } from '@/lib/utils'

// Merge Tailwind classes
<div className={cn(
  'base-class',
  isActive && 'active-class',
  className
)} />
```

### Debounce & Throttle

```tsx
import { debounce, throttle } from '@/lib/utils'

const debouncedSearch = debounce((value: string) => {
  performSearch(value)
}, 300)

const throttledScroll = throttle(() => {
  updateScrollPosition()
}, 100)
```

## Animation Patterns

### Framer Motion

```tsx
import { motion } from 'framer-motion'

// Fade in
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
/>

// Slide up
<motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.3 }}
/>

// Tap feedback
<motion.button
  whileTap={{ scale: 0.98 }}
/>

// List stagger
<motion.div>
  {items.map((item, i) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
    >
      {item.name}
    </motion.div>
  ))}
</motion.div>
```

## Best Practices

### 1. Always use Telegram haptic feedback
```tsx
import { useTelegram } from '@/hooks/useTelegram'

const { hapticFeedback } = useTelegram()

const handleClick = () => {
  hapticFeedback('selection')
  // ... your logic
}
```

### 2. Show loading states
```tsx
{isLoading ? <Spinner /> : <Content />}

// Or with suspense
<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>
```

### 3. Handle errors gracefully
```tsx
import { toast } from '@/components/ui'

try {
  await createAlert(data)
  toast.success('Alert created!')
} catch (error) {
  toast.error('Failed to create alert')
  console.error(error)
}
```

### 4. Use proper TypeScript types
```tsx
import type { Alert, Coin } from '@/types'

interface Props {
  alert: Alert
  onDelete: (id: number) => void
}

export function AlertCard({ alert, onDelete }: Props) {
  // ...
}
```

### 5. Memoize expensive computations
```tsx
import { useMemo } from 'react'

const sortedAlerts = useMemo(() => {
  return [...alerts].sort((a, b) => b.createdAt - a.createdAt)
}, [alerts])
```

### 6. Clean up effects
```tsx
useEffect(() => {
  const subscription = subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [])
```

## Color Reference

```tsx
// Text colors
text-tg-text        // Primary text
text-tg-hint        // Secondary text
text-tg-link        // Links

// Background colors
bg-surface          // #1C1C1E (base)
bg-surface-elevated // #2C2C2E
bg-surface-hover    // #3A3A3C
bg-surface-glass    // rgba(28, 28, 30, 0.7)

// Semantic colors
text-success        // #30D158
text-warning        // #FFD60A
text-danger         // #FF453A

bg-success-soft     // Success with 15% opacity
bg-warning-soft     // Warning with 15% opacity
bg-danger-soft      // Danger with 15% opacity

// Crypto colors
text-crypto-up      // #30D158 (green)
text-crypto-down    // #FF453A (red)
text-crypto-neutral // #8E8E93 (gray)

// Borders
border              // rgba(255, 255, 255, 0.1)
border-subtle       // rgba(255, 255, 255, 0.05)
```

## Spacing Reference

```tsx
// Padding/Margin
p-xs, m-xs         // 4px
p-sm, m-sm         // 8px
p-md, m-md         // 12px
p-lg, m-lg         // 16px
p-xl, m-xl         // 24px
p-2xl, m-2xl       // 32px
p-3xl, m-3xl       // 48px

// Gap
gap-xs             // 4px
gap-sm             // 8px
gap-md             // 12px
gap-lg             // 16px
// etc.
```

## Common Patterns

### Loading List
```tsx
{isLoading ? (
  Array.from({ length: 5 }).map((_, i) => (
    <CoinSkeleton key={i} />
  ))
) : (
  items.map(item => <ItemCard key={item.id} item={item} />)
)}
```

### Empty State
```tsx
{items.length === 0 ? (
  <EmptyState
    icon={<Inbox size={48} />}
    title="No alerts yet"
    description="Create your first price alert to get started"
    action={
      <Button onClick={() => navigate('/alerts/create')}>
        Create Alert
      </Button>
    }
  />
) : (
  // List items
)}
```

### Confirmation Flow
```tsx
const [isConfirmOpen, setIsConfirmOpen] = useState(false)
const [isDeleting, setIsDeleting] = useState(false)

const handleDelete = async () => {
  setIsDeleting(true)
  try {
    await deleteAlert(alert.id)
    toast.success('Alert deleted')
  } catch (error) {
    toast.error('Failed to delete alert')
  } finally {
    setIsDeleting(false)
    setIsConfirmOpen(false)
  }
}

<ConfirmDialog
  isOpen={isConfirmOpen}
  onClose={() => setIsConfirmOpen(false)}
  onConfirm={handleDelete}
  title="Delete Alert"
  message="Are you sure?"
  variant="danger"
  isLoading={isDeleting}
/>
```
