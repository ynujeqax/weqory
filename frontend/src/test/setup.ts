import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Telegram WebApp
if (typeof globalThis !== 'undefined') {
  ;(globalThis as any).Telegram = {
    WebApp: {
      initData: 'mock_init_data',
      initDataUnsafe: {
        user: {
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en',
        },
      },
      version: '6.0',
      platform: 'tdesktop',
      colorScheme: 'dark',
      themeParams: {
        bg_color: '#1c1c1e',
        text_color: '#ffffff',
        hint_color: '#8e8e93',
        link_color: '#007aff',
        button_color: '#007aff',
        button_text_color: '#ffffff',
        secondary_bg_color: '#2c2c2e',
      },
      isExpanded: true,
      viewportHeight: 800,
      viewportStableHeight: 800,
      headerColor: '#1c1c1e',
      backgroundColor: '#1c1c1e',
      isClosingConfirmationEnabled: false,
      BackButton: {
        isVisible: false,
        onClick: vi.fn(),
        offClick: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
      },
      MainButton: {
        text: '',
        color: '#007aff',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        setText: vi.fn(),
        onClick: vi.fn(),
        offClick: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        showProgress: vi.fn(),
        hideProgress: vi.fn(),
        setParams: vi.fn(),
      },
      HapticFeedback: {
        impactOccurred: vi.fn(),
        notificationOccurred: vi.fn(),
        selectionChanged: vi.fn(),
      },
      ready: vi.fn(),
      expand: vi.fn(),
      close: vi.fn(),
      enableClosingConfirmation: vi.fn(),
      disableClosingConfirmation: vi.fn(),
      onEvent: vi.fn(),
      offEvent: vi.fn(),
      sendData: vi.fn(),
      openLink: vi.fn(),
      openTelegramLink: vi.fn(),
      openInvoice: vi.fn(),
      showPopup: vi.fn(),
      showAlert: vi.fn(),
      showConfirm: vi.fn(),
      showScanQrPopup: vi.fn(),
      closeScanQrPopup: vi.fn(),
      readTextFromClipboard: vi.fn(),
      setHeaderColor: vi.fn(),
      setBackgroundColor: vi.fn(),
    },
  }

  // Mock IntersectionObserver
  ;(globalThis as any).IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return []
    }
    unobserve() {}
  }

  // Mock ResizeObserver
  ;(globalThis as any).ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  }
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
