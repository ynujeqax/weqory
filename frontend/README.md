# Weqory Frontend

Professional Telegram Mini App for cryptocurrency screening with real-time alerts.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development server
npm run dev
```

Visit http://localhost:3000

## Documentation

- **[Setup Guide](SETUP.md)** - Installation and development setup
- **[Phase 5.1 Summary](PHASE_5.1_SUMMARY.md)** - Complete architecture overview
- **[Component Guide](COMPONENT_GUIDE.md)** - Component usage examples

## Project Structure

```
frontend/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
├── src/
│   ├── api/                   # API clients & hooks
│   ├── app/                   # Router configuration
│   ├── components/
│   │   ├── ui/                # Reusable UI primitives (21 components)
│   │   └── common/            # Domain components
│   ├── features/
│   │   └── auth/              # Authentication flow
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities
│   ├── pages/                 # Page components (lazy loaded)
│   ├── stores/                # Zustand state management
│   ├── styles/                # Global styles
│   └── types/                 # TypeScript types
├── .env.example               # Environment variables template
├── index.html                 # Entry HTML
├── tailwind.config.js         # Tailwind configuration
└── vite.config.ts             # Vite build configuration
```

## Tech Stack

### Core
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Utility-first styling

### State Management
- **Zustand** - Client state (auth, prices)
- **React Query** - Server state & caching

### UI/UX
- **Framer Motion** - Animations (60fps)
- **Lucide React** - Icons
- **@telegram-apps/sdk** - Telegram integration

### Routing
- **React Router v7** - Client-side routing with lazy loading

## Features

### Phase 5.1 (Completed) ✅
- Bloomberg/Revolut inspired design system
- 21 production-ready UI components
- Authentication flow with Telegram InitData validation
- WebSocket real-time price streaming
- PWA support (installable, offline-capable)
- Error boundaries & graceful degradation
- Toast notifications with auto-dismiss
- Loading skeletons & states
- Type-safe throughout

### Coming Soon
- Watchlist management
- Alert creation & management
- Price history charts
- Market overview
- User profile & settings
- Subscription management

## Development

### Available Scripts

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test             # Run tests
npm run test:ui      # Run tests with UI
```

### Code Quality

- **TypeScript Strict Mode** - Full type safety
- **ESLint** - Code linting
- **Vitest** - Unit testing
- **Testing Library** - Component testing

### Component Development

All components follow these principles:
1. **Type-safe** - Explicit TypeScript interfaces
2. **Accessible** - ARIA labels, keyboard nav
3. **Performant** - Memoization, code splitting
4. **Animated** - Smooth 60fps animations
5. **Mobile-first** - 44px touch targets

Example:
```tsx
import { Button, toast } from '@/components/ui'
import { useTelegram } from '@/hooks/useTelegram'

export function MyComponent() {
  const { hapticFeedback } = useTelegram()

  const handleClick = () => {
    hapticFeedback('success')
    toast.success('Action completed!')
  }

  return (
    <Button variant="primary" onClick={handleClick}>
      Click me
    </Button>
  )
}
```

## Design System

### Colors
- Surface: `#1C1C1E` → `#2C2C2E` → `#3A3A3C`
- Success: `#30D158`
- Warning: `#FFD60A`
- Danger: `#FF453A`

### Typography
- Display: 48px/36px (bold)
- Headlines: 24px/20px/17px (semibold)
- Body: 17px/15px/13px (regular)
- Labels: 17px/15px/13px (medium)

### Spacing
- Base unit: 4px
- Scale: xs(4), sm(8), md(12), lg(16), xl(24), 2xl(32), 3xl(48)

### Animations
- Spring physics: `{ stiffness: 400, damping: 30 }`
- GPU-accelerated (transform/opacity only)
- Duration: 100-400ms based on context

## API Integration

### Authentication
```tsx
import { useAuthStore } from '@/stores/authStore'

const { user, isAuthenticated, logout } = useAuthStore()
```

### Real-time Prices
```tsx
import { usePriceStream } from '@/hooks/usePriceStream'
import { usePricesStore } from '@/stores/pricesStore'

const { isConnected } = usePriceStream(['BTCUSDT', 'ETHUSDT'])
const { getPrice } = usePricesStore()

const btcPrice = getPrice('BTCUSDT')
```

## Performance

### Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle size: < 200KB (gzipped)
- Lighthouse: > 90 (all categories)

### Optimizations
- Code splitting by route and vendor
- Lazy loading for all pages
- Image optimization with fallbacks
- Service worker caching
- Tree shaking enabled
- No unnecessary re-renders (memoization)

## PWA Features

- **Installable** - "Add to Home Screen" prompt
- **Offline Support** - Network-first, cache fallback
- **Native Feel** - Fullscreen, splash screen
- **Fast Loading** - Service worker precaching

## Telegram Integration

### Available APIs
- User authentication (InitData validation)
- Haptic feedback (vibration)
- Theme colors (dark mode)
- Native dialogs (confirm, alert)
- Main button (context actions)
- Back button (navigation)

### Example
```tsx
const { hapticFeedback, showConfirm } = useTelegram()

const handleDelete = async () => {
  hapticFeedback('warning')
  const confirmed = await showConfirm('Delete this item?')

  if (confirmed) {
    hapticFeedback('success')
    // Delete logic
  }
}
```

## Deployment

### Render
1. Connect GitHub repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add env variables
5. Deploy

### Environment Variables
```
VITE_API_URL=https://api.weqory.com/api
VITE_WS_URL=wss://api.weqory.com/ws/prices
VITE_ENV=production
```

## Browser Support

- Chrome/Edge (latest)
- Safari (iOS 14+)
- Firefox (latest)
- Telegram WebView (all versions)

## License

Proprietary - Weqory 2024

## Support

- Architecture: See [PHASE_5.1_SUMMARY.md](PHASE_5.1_SUMMARY.md)
- Components: See [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md)
- Setup: See [SETUP.md](SETUP.md)
