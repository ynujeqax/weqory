import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PriceStreamProvider } from './PriceStreamProvider'
import { usePricesStore } from '@/stores/pricesStore'
import { useAuthStore } from '@/stores/authStore'

// Mock WebSocket with static constants
class MockWebSocket {
  // Static constants matching real WebSocket
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  static instances: MockWebSocket[] = []

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)

    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Helper to simulate incoming message
  simulateMessage(data: object) {
    this.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(data),
    }))
  }

  static reset() {
    MockWebSocket.instances = []
  }

  static getLastInstance() {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }
}

// Replace global WebSocket with mock
const originalWebSocket = global.WebSocket
beforeEach(() => {
  global.WebSocket = MockWebSocket as unknown as typeof WebSocket
  MockWebSocket.reset()

  // Reset stores
  usePricesStore.setState({
    prices: new Map(),
    isConnected: false,
  })

  useAuthStore.setState({
    user: null,
    limits: null,
    token: null,
    isAuthenticated: false,
  })
})

afterEach(() => {
  global.WebSocket = originalWebSocket
  vi.clearAllMocks()
})

// Mock useWatchlist hook
vi.mock('@/api/hooks', () => ({
  useWatchlist: vi.fn(() => ({
    data: {
      items: [
        { coin: { binanceSymbol: 'BTCUSDT' } },
        { coin: { binanceSymbol: 'ETHUSDT' } },
      ],
    },
    isLoading: false,
    error: null,
  })),
}))

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('PriceStreamProvider', () => {
  describe('connection behavior', () => {
    it('should not connect when no token is available', async () => {
      const TestChild = () => <div>Test</div>

      render(
        <PriceStreamProvider>
          <TestChild />
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      // Wait a bit for any potential connection attempts
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(MockWebSocket.instances.length).toBe(0)
    })

    it('should connect when token is available', async () => {
      useAuthStore.setState({ token: 'test-token', isAuthenticated: true })

      const TestChild = () => <div>Test</div>

      render(
        <PriceStreamProvider>
          <TestChild />
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBe(1)
      })

      expect(MockWebSocket.getLastInstance()?.url).toContain('/ws/prices')
    })

    it('should set connection status to true on open', async () => {
      useAuthStore.setState({ token: 'test-token', isAuthenticated: true })

      const TestChild = () => <div>Test</div>

      render(
        <PriceStreamProvider>
          <TestChild />
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      await waitFor(() => {
        expect(usePricesStore.getState().isConnected).toBe(true)
      })
    })
  })

  describe('message handling', () => {
    it('should update prices store on price_update message', async () => {
      useAuthStore.setState({ token: 'test-token', isAuthenticated: true })

      const TestChild = () => <div>Test</div>

      render(
        <PriceStreamProvider>
          <TestChild />
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBe(1)
      })

      const ws = MockWebSocket.getLastInstance()

      // Wait for connection to open
      await waitFor(() => {
        expect(ws?.readyState).toBe(WebSocket.OPEN)
      })

      // Simulate price update message
      ws?.simulateMessage({
        type: 'price_update',
        payload: {
          symbol: 'BTCUSDT',
          price: 50000,
          change24hPct: 2.5,
          volume24h: 1000000,
          updatedAt: '2025-01-07T12:00:00Z',
        },
      })

      await waitFor(() => {
        const price = usePricesStore.getState().prices.get('BTCUSDT')
        expect(price).toBeDefined()
        expect(price?.price).toBe(50000)
        expect(price?.change24hPct).toBe(2.5)
      })
    })

    it('should handle multiple price updates', async () => {
      useAuthStore.setState({ token: 'test-token', isAuthenticated: true })

      render(
        <PriceStreamProvider>
          <div>Test</div>
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      await waitFor(() => {
        expect(MockWebSocket.getLastInstance()?.readyState).toBe(WebSocket.OPEN)
      })

      const ws = MockWebSocket.getLastInstance()

      // Send multiple updates
      ws?.simulateMessage({
        type: 'price_update',
        payload: { symbol: 'BTCUSDT', price: 50000, change24hPct: 2.5, volume24h: 1000000, updatedAt: '2025-01-07T12:00:00Z' },
      })

      ws?.simulateMessage({
        type: 'price_update',
        payload: { symbol: 'ETHUSDT', price: 3000, change24hPct: 1.5, volume24h: 500000, updatedAt: '2025-01-07T12:00:00Z' },
      })

      await waitFor(() => {
        const prices = usePricesStore.getState().prices
        expect(prices.size).toBe(2)
        expect(prices.get('BTCUSDT')?.price).toBe(50000)
        expect(prices.get('ETHUSDT')?.price).toBe(3000)
      })
    })

    it('should ignore pong messages', async () => {
      useAuthStore.setState({ token: 'test-token', isAuthenticated: true })

      render(
        <PriceStreamProvider>
          <div>Test</div>
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      await waitFor(() => {
        expect(MockWebSocket.getLastInstance()?.readyState).toBe(WebSocket.OPEN)
      })

      const ws = MockWebSocket.getLastInstance()

      // Send pong message - should not throw or update prices
      ws?.simulateMessage({ type: 'pong' })

      expect(usePricesStore.getState().prices.size).toBe(0)
    })
  })

  describe('subscription behavior', () => {
    it('should subscribe to watchlist symbols on connect', async () => {
      useAuthStore.setState({ token: 'test-token', isAuthenticated: true })

      render(
        <PriceStreamProvider>
          <div>Test</div>
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      await waitFor(() => {
        expect(MockWebSocket.getLastInstance()?.readyState).toBe(WebSocket.OPEN)
      })

      const ws = MockWebSocket.getLastInstance()

      // Check that subscribe message was sent
      await waitFor(() => {
        expect(ws?.sentMessages.length).toBeGreaterThan(0)
      })

      const subscribeMessage = ws?.sentMessages.find(msg => {
        const parsed = JSON.parse(msg)
        return parsed.type === 'subscribe'
      })

      expect(subscribeMessage).toBeDefined()
      const parsed = JSON.parse(subscribeMessage!)
      expect(parsed.payload.symbols).toContain('BTCUSDT')
      expect(parsed.payload.symbols).toContain('ETHUSDT')
    })
  })

  describe('cleanup behavior', () => {
    it('should disconnect and clear prices on logout', async () => {
      useAuthStore.setState({ token: 'test-token', isAuthenticated: true })

      const { unmount } = render(
        <PriceStreamProvider>
          <div>Test</div>
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      await waitFor(() => {
        expect(MockWebSocket.getLastInstance()?.readyState).toBe(WebSocket.OPEN)
      })

      // Simulate some prices in store
      usePricesStore.getState().updatePrice('BTCUSDT', {
        symbol: 'BTCUSDT',
        price: 50000,
        change24hPct: 2.5,
        volume24h: 1000000,
        updatedAt: '2025-01-07T12:00:00Z',
      })

      // Unmount component (simulates logout)
      unmount()

      // Prices should be cleared
      await waitFor(() => {
        expect(usePricesStore.getState().prices.size).toBe(0)
      })
    })
  })

  describe('renders children', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <PriceStreamProvider>
          <div>Child Content</div>
        </PriceStreamProvider>,
        { wrapper: createTestWrapper() }
      )

      expect(getByText('Child Content')).toBeInTheDocument()
    })
  })
})
