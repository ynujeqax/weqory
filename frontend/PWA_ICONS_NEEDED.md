# PWA Icons Required

The application is PWA-ready but requires icon assets. Place the following files in `/public`:

## Required Icons

### App Icons
- `icon-192.png` - 192x192px PNG (for smaller devices)
- `icon-512.png` - 512x512px PNG (for larger devices)

### Favicon
- `favicon.ico` - 32x32px ICO (browser tab icon)
- `favicon.png` - 32x32px PNG (modern browsers)

### Apple Touch Icons (Optional but Recommended)
- `apple-touch-icon.png` - 180x180px PNG (iOS home screen)

## Design Guidelines

### Style
- Dark background (#1C1C1E)
- Simple, recognizable logo
- High contrast for visibility
- Professional fintech aesthetic

### Format
- Use PNG format with transparency
- Ensure icons work on both light and dark backgrounds
- Make corners slightly rounded for better appearance
- Center the main icon element

### Color Palette
- Primary: #007AFF (Telegram blue)
- Accent: #30D158 (Success green)
- Background: #1C1C1E (Dark surface)
- Text: #FFFFFF (White)

## Icon Generation Tips

1. Start with a 512x512px artboard
2. Keep the main icon element within a 432x432px safe area (80% of canvas)
3. Export at multiple sizes:
   - 512x512 (high-res)
   - 192x192 (standard)
   - 180x180 (Apple)
   - 32x32 (favicon)

## Tools

Free icon generation tools:
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Maskable.app](https://maskable.app/) - Test maskable icons

## Current Status

- ✅ manifest.json configured
- ✅ Service worker ready (via Vite PWA)
- ❌ Icon assets need to be created
- ❌ Screenshots for app stores (optional)

## Next Steps

1. Design icon assets following the guidelines above
2. Place files in `/public` directory
3. Test PWA install on mobile device
4. Verify icons display correctly in:
   - Home screen (Android/iOS)
   - Task switcher
   - Splash screen
   - Browser tabs
