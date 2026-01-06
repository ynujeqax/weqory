/**
 * Accessibility utilities for the app
 */

/**
 * Generate accessible label for screen readers
 */
export function getAriaLabel(type: string, value?: string | number): string {
  switch (type) {
    case 'price':
      return `Current price: ${value}`
    case 'change':
      return `24-hour change: ${value}`
    case 'alert':
      return `Alert for ${value}`
    case 'coin':
      return `Cryptocurrency: ${value}`
    default:
      return String(value || '')
  }
}

/**
 * Check if color contrast meets WCAG AA standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  minRatio = 4.5
): boolean {
  const luminance = (rgb: number) => {
    const a = rgb / 255
    return a <= 0.03928 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4)
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1]!, 16),
          g: parseInt(result[2]!, 16),
          b: parseInt(result[3]!, 16),
        }
      : null
  }

  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)

  if (!fg || !bg) return false

  const fgLum =
    0.2126 * luminance(fg.r) +
    0.7152 * luminance(fg.g) +
    0.0722 * luminance(fg.b)

  const bgLum =
    0.2126 * luminance(bg.r) +
    0.7152 * luminance(bg.g) +
    0.0722 * luminance(bg.b)

  const ratio =
    fgLum > bgLum
      ? (fgLum + 0.05) / (bgLum + 0.05)
      : (bgLum + 0.05) / (fgLum + 0.05)

  return ratio >= minRatio
}

/**
 * Get accessible touch target size (minimum 44x44px per WCAG)
 */
export function getMinTouchTarget(): { minWidth: string; minHeight: string } {
  return {
    minWidth: '44px',
    minHeight: '44px',
  }
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Focus trap for modals/dialogs
 */
export function createFocusTrap(element: HTMLElement) {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !firstFocusable || !lastFocusable) return

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
  }

  element.addEventListener('keydown', handleTabKey)

  // Focus first element
  firstFocusable?.focus()

  return () => {
    element.removeEventListener('keydown', handleTabKey)
  }
}
