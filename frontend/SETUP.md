# Weqory Frontend Setup Guide

## Prerequisites
- Node.js 18+ (LTS recommended)
- npm or pnpm

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your values
# VITE_API_URL=http://localhost:8080/api
# VITE_WS_URL=ws://localhost:8080/ws/prices
```

## Development

```bash
# Start development server (http://localhost:3000)
npm run dev
```

## Build

```bash
# Type check
npm run build  # Runs tsc -b && vite build

# Preview production build
npm run preview
```

## Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## PWA Setup

To fully enable PWA features, you need to create icons:

1. Create app icons:
   - `/public/icon-192.png` (192x192px)
   - `/public/icon-512.png` (512x512px)

2. Optional: Add screenshot for app stores:
   - `/public/screenshot-1.png` (1170x2532px for iOS)

## Development Tips

### Hot Module Replacement
Vite provides instant HMR. Changes to React components will update without full page reload.

### Type Safety
TypeScript is configured in strict mode. All components must be properly typed.

### Import Aliases
Use `@/` for absolute imports:
```typescript
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
```

### Code Splitting
Pages are lazy-loaded automatically. Additional code splitting is configured in `vite.config.ts`.

## Telegram Mini App Testing

### Local Testing
1. Install Telegram Desktop
2. Create a bot via @BotFather
3. Set up Mini App via @BotFather
4. Use ngrok or similar to expose local server:
   ```bash
   ngrok http 3000
   ```
5. Update bot Mini App URL to ngrok URL

### Production Testing
Deploy to Render/Vercel and update bot Mini App URL.

## Environment Variables

### Required
- `VITE_API_URL` - Backend API endpoint
- `VITE_WS_URL` - WebSocket endpoint

### Optional
- `VITE_ENV` - Environment flag (development/staging/production)

## Troubleshooting

### Build Errors
If you see TypeScript errors, run:
```bash
npm run build
```

### WebSocket Connection Issues
1. Check `VITE_WS_URL` is correct
2. Ensure backend WebSocket server is running
3. Check browser console for connection errors

### PWA Not Installing
1. HTTPS is required (except localhost)
2. Manifest must be valid JSON
3. Icons must exist at specified paths
4. Service worker must register successfully

## Production Deployment

### Render (Recommended)
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### Docker
```bash
docker build -t weqory-frontend .
docker run -p 3000:80 weqory-frontend
```

## Performance Optimization

### Bundle Analysis
```bash
npm run build -- --mode analyze
```

### Lighthouse Audit
Run Chrome DevTools Lighthouse on production build.

Target scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
- PWA: > 90

## Code Quality

### Linting
```bash
npm run lint
```

### Type Checking
```bash
tsc --noEmit
```

## Architecture

See `PHASE_5.1_SUMMARY.md` for complete architecture overview.

## Support

For issues or questions:
1. Check `PHASE_5.1_SUMMARY.md`
2. Review component documentation in source files
3. Check TypeScript types in `/src/types/index.ts`
