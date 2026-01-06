# CLAUDE.md — Weqory Project Guidelines

> **Role:** You are a Senior Staff Engineer with 15+ years of experience in Go, TypeScript, React, distributed systems, and fintech/crypto applications. You write production-grade code that is secure, performant, and maintainable.

---

## 🎯 Project Context

**Weqory** is a Telegram Mini App for cryptocurrency screening with real-time alerts. This is a production fintech application handling real money (Telegram Stars) and real-time market data.

### Architecture Overview
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + Zustand + React Query
- **Backend:** Go 1.22+ microservices (API Gateway, Alert Engine, Notification Service)
- **Data:** PostgreSQL 16 + Redis 7
- **External:** Binance WebSocket, CoinGecko API, Telegram Bot API
- **Infra:** Render, Docker, GitHub Actions

---

## 🧠 Core Principles

### 1. Think Before Code
Before writing ANY code:
1. Understand the full context and requirements
2. Consider edge cases and failure modes
3. Plan the data flow and state management
4. Identify potential security vulnerabilities
5. Consider performance implications at scale

### 2. Production-First Mindset
Every line of code should be:
- **Secure** — Assume all input is malicious
- **Performant** — O(1) > O(log n) > O(n), always
- **Observable** — Proper logging, metrics, tracing
- **Resilient** — Graceful degradation, circuit breakers
- **Testable** — Design for testability from the start

### 3. KISS + YAGNI + DRY
- Keep It Simple, Stupid
- You Ain't Gonna Need It (don't over-engineer)
- Don't Repeat Yourself (but don't over-abstract either)

---

## 📁 Project Structure

### Backend (Go)
```
backend/
├── cmd/
│   ├── api-gateway/        # Main entry point for API Gateway
│   ├── alert-engine/       # Main entry point for Alert Engine
│   └── notification/       # Main entry point for Notification Service
├── internal/
│   ├── api/                # HTTP handlers, middleware, routes
│   │   ├── handlers/       # Request handlers (thin, delegate to services)
│   │   ├── middleware/     # Auth, rate limiting, logging, recovery
│   │   ├── routes/         # Route definitions
│   │   └── validators/     # Request validation
│   ├── service/            # Business logic layer
│   ├── repository/         # Data access layer (PostgreSQL)
│   ├── cache/              # Redis operations
│   ├── alert/              # Alert engine logic
│   ├── notification/       # Notification logic
│   ├── telegram/           # Telegram Bot API integration
│   ├── binance/            # Binance WebSocket client
│   ├── coingecko/          # CoinGecko API client
│   └── websocket/          # WebSocket server for clients
├── pkg/                    # Shared packages (can be imported by other projects)
│   ├── config/             # Configuration loading
│   ├── database/           # Database connection, migrations
│   ├── redis/              # Redis connection
│   ├── logger/             # Structured logging
│   ├── errors/             # Custom error types
│   ├── validator/          # Input validation utilities
│   └── crypto/             # Telegram InitData validation
├── db/
│   ├── migrations/         # SQL migrations (golang-migrate format)
│   ├── queries/            # sqlc query files
│   └── sqlc.yaml           # sqlc configuration
├── api/
│   └── openapi.yaml        # OpenAPI 3.0 specification
└── docker/
    └── Dockerfile          # Multi-stage production Dockerfile
```

### Frontend (React)
```
frontend/
├── src/
│   ├── app/                # App entry, providers, router
│   ├── pages/              # Page components (Watchlist, Alerts, History, Market, Profile)
│   ├── features/           # Feature-based modules
│   │   ├── auth/           # Authentication logic
│   │   ├── watchlist/      # Watchlist feature
│   │   ├── alerts/         # Alerts feature
│   │   ├── history/        # History feature
│   │   ├── market/         # Market feature
│   │   └── profile/        # Profile feature
│   ├── components/         # Shared UI components
│   │   ├── ui/             # Base UI primitives
│   │   └── common/         # Composed components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   ├── api/                # API client, React Query hooks
│   ├── lib/                # Utility functions
│   ├── types/              # TypeScript types
│   └── styles/             # Global styles, Tailwind config
├── public/
└── index.html
```

---

## 🔧 Go Code Standards

### General Rules
```go
// ✅ DO: Use explicit error handling
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}

// ❌ DON'T: Ignore errors
result, _ := someFunction() // NEVER do this

// ✅ DO: Use context for cancellation and timeouts
func (s *Service) GetUser(ctx context.Context, id int64) (*User, error)

// ❌ DON'T: Ignore context
func (s *Service) GetUser(id int64) (*User, error) // Missing context

// ✅ DO: Use structured logging
s.logger.Info("user created",
    slog.Int64("user_id", user.ID),
    slog.String("telegram_id", user.TelegramID),
)

// ❌ DON'T: Use fmt.Printf for logging
fmt.Printf("user created: %d\n", user.ID) // NEVER in production
```

### Error Handling Pattern
```go
// Define domain-specific errors
var (
    ErrUserNotFound     = errors.New("user not found")
    ErrAlertLimitExceed = errors.New("alert limit exceeded")
    ErrInvalidInput     = errors.New("invalid input")
)

// Wrap errors with context
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*User, error) {
    user, err := r.queries.GetUserByID(ctx, id)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("get user by id %d: %w", id, err)
    }
    return user, nil
}

// Handle errors at API layer with proper HTTP codes
func (h *Handler) GetUser(c *fiber.Ctx) error {
    user, err := h.userService.GetByID(c.Context(), userID)
    if err != nil {
        switch {
        case errors.Is(err, ErrUserNotFound):
            return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
                Error: "User not found",
            })
        default:
            h.logger.Error("failed to get user", slog.String("error", err.Error()))
            return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
                Error: "Internal server error",
            })
        }
    }
    return c.JSON(user)
}
```

### Database Patterns (sqlc)
```sql
-- db/queries/users.sql
-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByTelegramID :one
SELECT * FROM users WHERE telegram_id = $1;

-- name: CreateUser :one
INSERT INTO users (telegram_id, username, first_name, last_name, language_code, plan, created_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
RETURNING *;

-- name: UpdateUserPlan :exec
UPDATE users SET plan = $2, updated_at = NOW() WHERE id = $1;
```

### Concurrency Patterns
```go
// ✅ DO: Use worker pools for parallel processing
func (e *AlertEngine) processAlerts(ctx context.Context, prices []Price) {
    sem := make(chan struct{}, 100) // Limit concurrent goroutines
    var wg sync.WaitGroup
    
    for _, price := range prices {
        wg.Add(1)
        sem <- struct{}{} // Acquire
        go func(p Price) {
            defer wg.Done()
            defer func() { <-sem }() // Release
            e.checkAlertsForPrice(ctx, p)
        }(price)
    }
    wg.Wait()
}

// ✅ DO: Use errgroup for error propagation
func (s *Service) FetchAllData(ctx context.Context) error {
    g, ctx := errgroup.WithContext(ctx)
    
    g.Go(func() error { return s.fetchPrices(ctx) })
    g.Go(func() error { return s.fetchMarketCap(ctx) })
    g.Go(func() error { return s.fetchVolume(ctx) })
    
    return g.Wait()
}
```

### HTTP Handler Pattern
```go
// Handler should be thin — only handle HTTP concerns
func (h *AlertHandler) CreateAlert(c *fiber.Ctx) error {
    // 1. Parse and validate request
    var req CreateAlertRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
            Error: "Invalid request body",
        })
    }
    
    if err := h.validator.Struct(req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
            Error:   "Validation failed",
            Details: formatValidationErrors(err),
        })
    }
    
    // 2. Get user from context (set by auth middleware)
    userID := c.Locals("user_id").(int64)
    
    // 3. Delegate to service
    alert, err := h.alertService.Create(c.Context(), userID, req)
    if err != nil {
        return h.handleError(c, err)
    }
    
    // 4. Return response
    return c.Status(fiber.StatusCreated).JSON(alert)
}
```

### WebSocket Pattern (Binance)
```go
// ✅ DO: Implement reconnection with exponential backoff
func (c *BinanceClient) Connect(ctx context.Context) {
    backoff := time.Second
    maxBackoff := time.Minute
    
    for {
        select {
        case <-ctx.Done():
            return
        default:
        }
        
        err := c.connect(ctx)
        if err != nil {
            c.logger.Error("websocket connection failed", 
                slog.String("error", err.Error()),
                slog.Duration("retry_in", backoff),
            )
            time.Sleep(backoff)
            backoff = min(backoff*2, maxBackoff)
            continue
        }
        
        backoff = time.Second // Reset on successful connection
        c.readMessages(ctx)
    }
}
```

---

## ⚛️ React/TypeScript Code Standards

### Component Pattern
```tsx
// ✅ DO: Use function components with explicit typing
interface AlertCardProps {
  alert: Alert;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AlertCard({ alert, onPause, onDelete }: AlertCardProps) {
  const { t } = useTranslation();
  
  const handlePause = useCallback(() => {
    onPause(alert.id);
  }, [alert.id, onPause]);
  
  return (
    <div className="rounded-lg bg-surface p-4">
      {/* ... */}
    </div>
  );
}

// ❌ DON'T: Use React.FC (deprecated pattern)
const AlertCard: React.FC<AlertCardProps> = ({ alert }) => { /* ... */ }
```

### React Query Pattern
```tsx
// api/alerts.ts
export const alertKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
  list: (filters: AlertFilters) => [...alertKeys.lists(), filters] as const,
  details: () => [...alertKeys.all, 'detail'] as const,
  detail: (id: string) => [...alertKeys.details(), id] as const,
};

export function useAlerts(filters: AlertFilters) {
  return useQuery({
    queryKey: alertKeys.list(filters),
    queryFn: () => api.alerts.list(filters),
    staleTime: 30_000, // 30 seconds
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateAlertDTO) => api.alerts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}
```

### Zustand Store Pattern
```tsx
// stores/alertStore.ts
interface AlertStore {
  // State
  selectedCoin: Coin | null;
  alertType: AlertType;
  targetPrice: string;
  
  // Actions
  setSelectedCoin: (coin: Coin | null) => void;
  setAlertType: (type: AlertType) => void;
  setTargetPrice: (price: string) => void;
  reset: () => void;
}

const initialState = {
  selectedCoin: null,
  alertType: 'PRICE_ABOVE' as AlertType,
  targetPrice: '',
};

export const useAlertStore = create<AlertStore>((set) => ({
  ...initialState,
  
  setSelectedCoin: (coin) => set({ selectedCoin: coin }),
  setAlertType: (type) => set({ alertType: type }),
  setTargetPrice: (price) => set({ targetPrice: price }),
  reset: () => set(initialState),
}));
```

### Custom Hooks Pattern
```tsx
// hooks/useWebSocket.ts
export function usePriceWebSocket(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, Price>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    if (symbols.length === 0) return;
    
    const ws = new WebSocket(`${WS_URL}/prices`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', symbols }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as PriceUpdate;
      setPrices((prev) => new Map(prev).set(data.symbol, data));
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      ws.close();
    };
  }, [symbols.join(',')]); // Dependency on serialized symbols
  
  return prices;
}
```

### Form Handling Pattern
```tsx
// ✅ DO: Use controlled components with proper validation
export function CreateAlertForm() {
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createAlert = useCreateAlert();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    try {
      await createAlert.mutateAsync({ targetPrice: price });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}
```

### Telegram Mini App Integration
```tsx
// ✅ DO: Properly initialize and use Telegram SDK
import { init, miniApp, themeParams } from '@telegram-apps/sdk';

export function initTelegramApp() {
  try {
    init();
    
    // Expand to full height
    miniApp.expand();
    
    // Enable closing confirmation
    miniApp.enableClosingConfirmation();
    
    // Set header color based on theme
    miniApp.setHeaderColor(themeParams.backgroundColor());
    
  } catch (error) {
    console.error('Failed to init Telegram Mini App:', error);
    // Handle non-Telegram environment (development)
  }
}

// ✅ DO: Use Telegram theme colors
const telegramColors = {
  bg: 'var(--tg-theme-bg-color)',
  text: 'var(--tg-theme-text-color)',
  hint: 'var(--tg-theme-hint-color)',
  link: 'var(--tg-theme-link-color)',
  button: 'var(--tg-theme-button-color)',
  buttonText: 'var(--tg-theme-button-text-color)',
  secondary: 'var(--tg-theme-secondary-bg-color)',
};
```

---

## 🔒 Security Requirements

### CRITICAL — Never Skip These

1. **Telegram InitData Validation**
```go
// ALWAYS validate InitData hash before trusting user identity
func ValidateInitData(initData string, botToken string) (*TelegramUser, error) {
    // Parse initData query string
    values, err := url.ParseQuery(initData)
    if err != nil {
        return nil, ErrInvalidInitData
    }
    
    // Check auth_date is recent (within 24 hours)
    authDate, _ := strconv.ParseInt(values.Get("auth_date"), 10, 64)
    if time.Now().Unix()-authDate > 86400 {
        return nil, ErrExpiredInitData
    }
    
    // Verify hash using HMAC-SHA256
    hash := values.Get("hash")
    values.Del("hash")
    
    // Sort and create data-check-string
    var keys []string
    for k := range values {
        keys = append(keys, k)
    }
    sort.Strings(keys)
    
    var dataCheckString strings.Builder
    for i, k := range keys {
        if i > 0 {
            dataCheckString.WriteByte('\n')
        }
        dataCheckString.WriteString(k)
        dataCheckString.WriteByte('=')
        dataCheckString.WriteString(values.Get(k))
    }
    
    // Calculate expected hash
    secretKey := hmac.New(sha256.New, []byte("WebAppData"))
    secretKey.Write([]byte(botToken))
    
    h := hmac.New(sha256.New, secretKey.Sum(nil))
    h.Write([]byte(dataCheckString.String()))
    expectedHash := hex.EncodeToString(h.Sum(nil))
    
    if !hmac.Equal([]byte(hash), []byte(expectedHash)) {
        return nil, ErrInvalidHash
    }
    
    // Parse user data
    // ...
}
```

2. **Input Validation — Trust Nothing**
```go
// Validate ALL inputs
type CreateAlertRequest struct {
    Symbol      string    `json:"symbol" validate:"required,min=2,max=20,alphanum"`
    AlertType   string    `json:"alert_type" validate:"required,oneof=PRICE_ABOVE PRICE_BELOW PRICE_CHANGE_PCT"`
    TargetPrice float64   `json:"target_price" validate:"required,gt=0,lt=100000000"`
    Recurring   bool      `json:"recurring"`
}

// Sanitize before database operations
func sanitizeSymbol(symbol string) string {
    return strings.ToUpper(strings.TrimSpace(symbol))
}
```

3. **SQL Injection Prevention**
```go
// ✅ DO: Use sqlc with parameterized queries
user, err := queries.GetUserByID(ctx, userID) // Safe

// ❌ NEVER: String concatenation in SQL
query := fmt.Sprintf("SELECT * FROM users WHERE id = %d", userID) // DANGEROUS
```

4. **Rate Limiting**
```go
// Implement per-user rate limiting
func RateLimitMiddleware(limiter *redis.RateLimiter) fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := c.Locals("user_id").(int64)
        
        allowed, remaining, resetAt, err := limiter.Allow(c.Context(), 
            fmt.Sprintf("rate:%d", userID),
            100,          // Max requests
            time.Minute,  // Window
        )
        
        c.Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
        c.Set("X-RateLimit-Reset", strconv.FormatInt(resetAt, 10))
        
        if !allowed {
            return c.Status(fiber.StatusTooManyRequests).JSON(ErrorResponse{
                Error: "Rate limit exceeded",
            })
        }
        
        return c.Next()
    }
}
```

---

## 🚀 Performance Requirements

### Database
- Use connection pooling (pgxpool)
- Add indexes for frequently queried columns
- Use EXPLAIN ANALYZE for slow queries
- Batch operations where possible

```go
// ✅ DO: Use batch inserts
func (r *AlertHistoryRepository) CreateBatch(ctx context.Context, histories []AlertHistory) error {
    batch := &pgx.Batch{}
    for _, h := range histories {
        batch.Queue(`
            INSERT INTO alert_history (alert_id, triggered_at, price, notified)
            VALUES ($1, $2, $3, $4)
        `, h.AlertID, h.TriggeredAt, h.Price, h.Notified)
    }
    
    results := r.pool.SendBatch(ctx, batch)
    defer results.Close()
    
    for range histories {
        if _, err := results.Exec(); err != nil {
            return err
        }
    }
    return nil
}
```

### Redis
- Use pipelining for multiple operations
- Set appropriate TTLs
- Use pub/sub efficiently

```go
// ✅ DO: Use Redis pipeline
func (c *PriceCache) SetMultiple(ctx context.Context, prices []Price) error {
    pipe := c.client.Pipeline()
    
    for _, p := range prices {
        key := fmt.Sprintf("price:%s", p.Symbol)
        pipe.Set(ctx, key, p.Price, 5*time.Minute)
    }
    
    _, err := pipe.Exec(ctx)
    return err
}
```

### Frontend
- Memoize expensive computations
- Virtual lists for long lists
- Debounce search inputs
- Lazy load routes

```tsx
// ✅ DO: Memoize expensive operations
const sortedAlerts = useMemo(() => {
  return [...alerts].sort((a, b) => b.createdAt - a.createdAt);
}, [alerts]);

// ✅ DO: Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function AlertList({ alerts }: { alerts: Alert[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: alerts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <AlertCard
            key={alerts[virtualItem.index].id}
            alert={alerts[virtualItem.index]}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Testing Requirements

### Go Tests
```go
// Unit tests for services
func TestAlertService_Create(t *testing.T) {
    // Arrange
    mockRepo := mocks.NewMockAlertRepository(t)
    mockCache := mocks.NewMockPriceCache(t)
    service := NewAlertService(mockRepo, mockCache)
    
    mockRepo.EXPECT().
        CountByUserID(mock.Anything, int64(1)).
        Return(5, nil)
    
    mockRepo.EXPECT().
        Create(mock.Anything, mock.AnythingOfType("*Alert")).
        Return(nil)
    
    // Act
    alert, err := service.Create(context.Background(), 1, CreateAlertRequest{
        Symbol:      "BTCUSDT",
        AlertType:   "PRICE_ABOVE",
        TargetPrice: 100000,
    })
    
    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, alert)
    assert.Equal(t, "BTCUSDT", alert.Symbol)
}

// Integration tests with real database
func TestAlertRepository_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }
    
    // Use testcontainers for isolated database
    // ...
}
```

### React Tests
```tsx
// Component tests
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertCard } from './AlertCard';

describe('AlertCard', () => {
  const mockAlert: Alert = {
    id: '1',
    symbol: 'BTCUSDT',
    alertType: 'PRICE_ABOVE',
    targetPrice: 100000,
    status: 'ACTIVE',
  };
  
  it('renders alert information correctly', () => {
    render(<AlertCard alert={mockAlert} onPause={vi.fn()} onDelete={vi.fn()} />);
    
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
  });
  
  it('calls onPause when pause button clicked', async () => {
    const onPause = vi.fn();
    render(<AlertCard alert={mockAlert} onPause={onPause} onDelete={vi.fn()} />);
    
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    
    expect(onPause).toHaveBeenCalledWith('1');
  });
});
```

---

## 📝 Code Review Checklist

Before committing ANY code, verify:

### General
- [ ] No hardcoded secrets or credentials
- [ ] No console.log / fmt.Printf in production code
- [ ] All errors are properly handled
- [ ] Code follows project structure
- [ ] No unused imports or variables

### Go
- [ ] Context is passed to all I/O operations
- [ ] Errors are wrapped with context
- [ ] Goroutines have proper cleanup
- [ ] Database queries use parameterized queries
- [ ] Rate limiting is applied to endpoints

### React
- [ ] No unnecessary re-renders
- [ ] Proper cleanup in useEffect
- [ ] Loading and error states handled
- [ ] Accessibility attributes present
- [ ] TypeScript types are explicit (no `any`)

### Security
- [ ] Input validation on all user inputs
- [ ] Telegram InitData validated
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CORS properly configured

---

## 🚫 Forbidden Patterns

### Never Do These

```go
// ❌ NEVER: Ignore errors
result, _ := someFunction()

// ❌ NEVER: Use panic in production code
panic("something went wrong")

// ❌ NEVER: SQL string concatenation
query := "SELECT * FROM users WHERE id = " + id

// ❌ NEVER: Store secrets in code
const API_KEY = "sk_live_123..."

// ❌ NEVER: Trust user input
userID := c.Params("id") // Use directly without validation
```

```tsx
// ❌ NEVER: Use any type
const data: any = response.data;

// ❌ NEVER: Mutate state directly
state.items.push(newItem);

// ❌ NEVER: Missing dependency in useEffect
useEffect(() => {
  fetchData(userId);
}, []); // Missing userId

// ❌ NEVER: Inline functions in props (causes re-renders)
<Button onClick={() => handleClick(id)} />

// ❌ NEVER: Index as key for dynamic lists
{items.map((item, index) => <Item key={index} />)}
```

---

## 💡 When Stuck

1. **Read the requirements again** — Most issues come from misunderstanding
2. **Check existing patterns** — Look for similar code in the project
3. **Start simple** — Get it working first, then optimize
4. **Write tests first** — TDD often clarifies requirements
5. **Ask for clarification** — Better to ask than assume

---

## 📚 Reference Documentation

- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments)
- [Effective Go](https://go.dev/doc/effective_go)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [sqlc Documentation](https://docs.sqlc.dev/)
- [Fiber Documentation](https://docs.gofiber.io/)

---

*Remember: You're building a fintech application. Every bug could cost users money. Every security hole could compromise user data. Code accordingly.*
