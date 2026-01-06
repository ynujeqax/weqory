# WEQORY — Crypto Screener Telegram Mini App

## Project Overview

**Name:** Weqory
**Type:** Telegram Mini App (WebApp)
**Bot:** @weqory_screener_bot
**Purpose:** Cryptocurrency screener with customizable alerts delivered via Telegram notifications

### Key Features
- Real-time cryptocurrency price tracking
- Customizable price alerts with multiple conditions
- Instant Telegram push notifications
- Market overview dashboard
- Subscription-based monetization via Telegram Stars

### Competitive Advantage
- Native Telegram integration (vs web + email competitors)
- Instant push notifications (vs slow email delivery)
- Mobile-first experience
- One-tap alert management

---

## Tech Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.x |
| TypeScript | Type Safety | 5.x |
| Vite | Build Tool | 5.x |
| TailwindCSS | Styling | 3.x |
| @telegram-apps/sdk | Telegram Mini App SDK | Latest |
| Zustand | State Management | 4.x |
| React Query (TanStack) | Server State + Caching | 5.x |
| Recharts | Charts/Sparklines | 2.x |
| Axios | HTTP Client | 1.x |

### Backend (Go Microservices)
| Technology | Purpose | Version |
|------------|---------|---------|
| Go | Language | 1.22+ |
| Fiber | HTTP Framework | v2 |
| gorilla/websocket | WebSocket | 1.x |
| pgx | PostgreSQL Driver | v5 |
| sqlc | Type-safe SQL Generator | 1.x |
| go-redis | Redis Client | v9 |
| telebot | Telegram Bot API | v3 |
| golang-jwt | JWT Authentication | 5.x |

### Data Layer
| Technology | Purpose | Version |
|------------|---------|---------|
| PostgreSQL | Primary Database | 16 |
| Redis | Cache, Pub/Sub, Rate Limits | 7 |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Render | Cloud Hosting (Services + DB + Redis) |
| Docker | Containerization |
| GitHub Actions | CI/CD Pipeline |

### External APIs
| API | Purpose | Rate Limits |
|-----|---------|-------------|
| Binance WebSocket | Real-time prices for alerts | No limit (streaming) |
| Binance REST API | Coin list, historical data | 1200/min |
| CoinGecko API | Market page data | 10-50/min (free) |
| Alternative.me API | Fear & Greed Index | No strict limit |
| Telegram Bot API | Notifications + Payments | 30 msg/sec |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TELEGRAM                                    │
│                                                                          │
│   ┌─────────────────┐              ┌─────────────────────────────────┐  │
│   │  Telegram Bot   │              │     Telegram Mini App           │  │
│   │  @weqory_       │              │     (React WebApp)              │  │
│   │  screener_bot   │              │                                 │  │
│   │                 │              │  ┌─────────────────────────┐    │  │
│   │  • /start       │              │  │ Pages:                  │    │  │
│   │  • Notifications│              │  │ • Watchlist             │    │  │
│   │  • Inline kbd   │              │  │ • Alerts                │    │  │
│   └────────▲────────┘              │  │ • History               │    │  │
│            │                       │  │ • Market                │    │  │
│            │                       │  │ • Profile               │    │  │
│            │                       │  └─────────────────────────┘    │  │
│            │                       └──────────────▲──────────────────┘  │
└────────────┼──────────────────────────────────────┼──────────────────────┘
             │                                      │
             │ Telegram Bot API                     │ HTTPS + WebSocket
             │ (Webhooks)                           │
             │                                      │
┌────────────┴──────────────────────────────────────┴──────────────────────┐
│                                                                          │
│                           BACKEND SERVICES                               │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        API GATEWAY SERVICE                         │ │
│  │                                                                    │ │
│  │  Responsibilities:                                                 │ │
│  │  • REST API endpoints for all CRUD operations                     │ │
│  │  • WebSocket server for real-time prices to clients               │ │
│  │  • Telegram InitData validation (authentication)                  │ │
│  │  • Request validation and rate limiting                           │ │
│  │  • Telegram Stars payment processing                              │ │
│  │                                                                    │ │
│  │  Endpoints:                                                        │ │
│  │  • /api/v1/auth/*        - Authentication                         │ │
│  │  • /api/v1/users/*       - User management                        │ │
│  │  • /api/v1/watchlist/*   - Watchlist CRUD                         │ │
│  │  • /api/v1/alerts/*      - Alerts CRUD                            │ │
│  │  • /api/v1/history/*     - Alert history                          │ │
│  │  • /api/v1/market/*      - Market data                            │ │
│  │  • /api/v1/payments/*    - Subscription management                │ │
│  │  • /ws/prices            - WebSocket for live prices              │ │
│  │                                                                    │ │
│  │  Port: 8080                                                        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                       ALERT ENGINE SERVICE                         │ │
│  │                                                                    │ │
│  │  Responsibilities:                                                 │ │
│  │  • Connect to Binance WebSocket (all tickers stream)              │ │
│  │  • Update price cache in Redis                                    │ │
│  │  • Load active alerts from PostgreSQL                             │ │
│  │  • Check alert conditions against live prices                     │ │
│  │  • Publish triggered alerts to Redis Pub/Sub                      │ │
│  │                                                                    │ │
│  │  Binance Streams:                                                  │ │
│  │  • wss://stream.binance.com:9443/ws/!ticker@arr                   │ │
│  │                                                                    │ │
│  │  Alert Types:                                                      │ │
│  │  • PRICE_ABOVE        - Price goes above X                        │ │
│  │  • PRICE_BELOW        - Price goes below X                        │ │
│  │  • PRICE_CHANGE_PCT   - Price changes by X% in timeframe          │ │
│  │  • VOLUME_CHANGE_PCT  - Volume changes by X% in timeframe         │ │
│  │  • VOLUME_SPIKE       - Volume increases by Xx in timeframe       │ │
│  │  • MARKET_CAP_ABOVE   - Market cap goes above X                   │ │
│  │  • MARKET_CAP_BELOW   - Market cap goes below X                   │ │
│  │  • PERIODIC           - Send price every X minutes/hours          │ │
│  │                                                                    │ │
│  │  Port: 8081 (health check only)                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼ Redis Pub/Sub                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    NOTIFICATION SERVICE                            │ │
│  │                                                                    │ │
│  │  Responsibilities:                                                 │ │
│  │  • Subscribe to triggered alerts from Redis Pub/Sub               │ │
│  │  • Check user notification limits                                 │ │
│  │  • Format and send Telegram notifications                         │ │
│  │  • Handle one-time vs recurring alerts                            │ │
│  │  • Save triggered alerts to history                               │ │
│  │  • Update alert status (triggered, paused, deleted)               │ │
│  │                                                                    │ │
│  │  Notification Format:                                              │ │
│  │  ┌─────────────────────────────────────┐                          │ │
│  │  │ 🔔 Alert Triggered!                 │                          │ │
│  │  │                                     │                          │ │
│  │  │ BTC/USDT                           │                          │ │
│  │  │ Condition: Price above $100,000    │                          │ │
│  │  │ Current: $100,234.56               │                          │ │
│  │  │ Time: 2026-01-04 15:30:00 UTC      │                          │ │
│  │  │                                     │                          │ │
│  │  │ [View in App] [Pause] [Delete]     │                          │ │
│  │  └─────────────────────────────────────┘                          │ │
│  │                                                                    │ │
│  │  Port: 8082 (health check only)                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │ PostgreSQL  │     │    Redis    │     │  Binance    │
    │             │     │             │     │  WebSocket  │
    │ Primary DB  │     │ • Prices    │     │             │
    │             │     │ • Pub/Sub   │     │ Real-time   │
    │ • users     │     │ • Sessions  │     │ prices      │
    │ • alerts    │     │ • Rate lim  │     │             │
    │ • watchlist │     │             │     │             │
    │ • history   │     │             │     │             │
    │ • payments  │     │             │     │             │
    │ • coins     │     │             │     │             │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### Service Communication

```
┌─────────────────┐         ┌─────────────────┐
│   API Gateway   │◄───────►│   PostgreSQL    │  Direct connection
└────────┬────────┘         └─────────────────┘
         │
         │ Read/Write
         ▼
┌─────────────────┐         ┌─────────────────┐
│     Redis       │◄───────►│  Alert Engine   │  Price updates
└────────┬────────┘         └─────────────────┘
         │
         │ Pub/Sub (triggered_alerts channel)
         ▼
┌─────────────────┐
│  Notification   │
│    Service      │
└─────────────────┘
```

---

## Database Schema

### PostgreSQL Tables

```sql
-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id                    BIGSERIAL PRIMARY KEY,
    telegram_id           BIGINT UNIQUE NOT NULL,
    username              VARCHAR(255),
    first_name            VARCHAR(255),
    last_name             VARCHAR(255),
    language_code         VARCHAR(10) DEFAULT 'en',

    -- Subscription
    plan                  VARCHAR(20) DEFAULT 'standard', -- standard, pro, ultimate
    plan_expires_at       TIMESTAMP WITH TIME ZONE,
    plan_period           VARCHAR(10), -- monthly, yearly

    -- Notification limits
    notifications_used    INTEGER DEFAULT 0,
    notifications_reset_at TIMESTAMP WITH TIME ZONE,

    -- Settings
    notifications_enabled BOOLEAN DEFAULT true,
    vibration_enabled     BOOLEAN DEFAULT true,

    -- Timestamps
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_plan ON users(plan);

-- ============================================
-- COINS TABLE (cached from Binance)
-- ============================================
CREATE TABLE coins (
    id                    SERIAL PRIMARY KEY,
    symbol                VARCHAR(20) UNIQUE NOT NULL,  -- BTC, ETH, etc.
    name                  VARCHAR(100) NOT NULL,        -- Bitcoin, Ethereum
    binance_symbol        VARCHAR(20) NOT NULL,         -- BTCUSDT
    is_stablecoin         BOOLEAN DEFAULT false,
    rank_by_market_cap    INTEGER,

    -- Cached data (updated periodically)
    current_price         DECIMAL(30, 10),
    market_cap            DECIMAL(30, 2),
    volume_24h            DECIMAL(30, 2),
    price_change_24h_pct  DECIMAL(10, 4),

    last_updated          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coins_symbol ON coins(symbol);
CREATE INDEX idx_coins_binance_symbol ON coins(binance_symbol);
CREATE INDEX idx_coins_rank ON coins(rank_by_market_cap);

-- ============================================
-- WATCHLIST TABLE
-- ============================================
CREATE TABLE watchlist (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coin_id               INTEGER NOT NULL REFERENCES coins(id) ON DELETE CASCADE,

    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, coin_id)
);

CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_coin_id ON watchlist(coin_id);

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE alerts (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coin_id               INTEGER NOT NULL REFERENCES coins(id) ON DELETE CASCADE,

    -- Alert configuration
    alert_type            VARCHAR(30) NOT NULL,
    -- Types: PRICE_ABOVE, PRICE_BELOW, PRICE_CHANGE_PCT, VOLUME_CHANGE_PCT,
    --        VOLUME_SPIKE, MARKET_CAP_ABOVE, MARKET_CAP_BELOW, PERIODIC

    condition_operator    VARCHAR(10) NOT NULL,  -- above, below, change
    condition_value       DECIMAL(30, 10) NOT NULL,  -- target price/percentage
    condition_timeframe   VARCHAR(20),  -- 5m, 15m, 1h, 4h, 24h (for % changes)

    -- Behavior
    is_recurring          BOOLEAN DEFAULT false,  -- one-time or recurring
    is_paused             BOOLEAN DEFAULT false,

    -- For periodic alerts
    periodic_interval     VARCHAR(20),  -- 5m, 15m, 30m, 1h, 4h, 24h

    -- Tracking
    times_triggered       INTEGER DEFAULT 0,
    last_triggered_at     TIMESTAMP WITH TIME ZONE,
    price_when_created    DECIMAL(30, 10),  -- price at alert creation time

    -- Timestamps
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_coin_id ON alerts(coin_id);
CREATE INDEX idx_alerts_active ON alerts(user_id) WHERE is_paused = false;

-- ============================================
-- ALERT HISTORY TABLE
-- ============================================
CREATE TABLE alert_history (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_id              BIGINT REFERENCES alerts(id) ON DELETE SET NULL,
    coin_id               INTEGER NOT NULL REFERENCES coins(id) ON DELETE CASCADE,

    -- Snapshot at trigger time
    alert_type            VARCHAR(30) NOT NULL,
    condition_operator    VARCHAR(10) NOT NULL,
    condition_value       DECIMAL(30, 10) NOT NULL,
    condition_timeframe   VARCHAR(20),

    -- Trigger details
    triggered_price       DECIMAL(30, 10) NOT NULL,
    triggered_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Notification status
    notification_sent     BOOLEAN DEFAULT false,
    notification_error    TEXT
);

CREATE INDEX idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX idx_alert_history_triggered_at ON alert_history(triggered_at);
CREATE INDEX idx_alert_history_coin_id ON alert_history(coin_id);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Telegram Stars payment
    telegram_payment_id   VARCHAR(255) UNIQUE,

    -- Plan info
    plan                  VARCHAR(20) NOT NULL,  -- pro, ultimate
    period                VARCHAR(10) NOT NULL,  -- monthly, yearly

    -- Amount
    stars_amount          INTEGER NOT NULL,

    -- Status
    status                VARCHAR(20) DEFAULT 'pending',  -- pending, completed, refunded

    -- Timestamps
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at          TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================
-- SUBSCRIPTION PLANS (reference table)
-- ============================================
CREATE TABLE subscription_plans (
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(20) UNIQUE NOT NULL,  -- standard, pro, ultimate

    -- Limits
    max_coins             INTEGER NOT NULL,
    max_alerts            INTEGER NOT NULL,
    max_notifications     INTEGER,  -- NULL = unlimited
    history_retention_days INTEGER NOT NULL,

    -- Pricing (in Telegram Stars)
    price_monthly         INTEGER,  -- NULL for free plan
    price_yearly          INTEGER,

    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, max_coins, max_alerts, max_notifications, history_retention_days, price_monthly, price_yearly) VALUES
('standard', 3, 6, 18, 1, NULL, NULL),
('pro', 9, 18, 162, 7, 250, 2500),
('ultimate', 27, 54, NULL, 30, 750, 7500);
```

### Redis Data Structures

```
# ============================================
# PRICE CACHE (Hash)
# ============================================
# Key: prices:{symbol}
# Fields: price, volume_24h, change_24h_pct, updated_at

HSET prices:BTCUSDT price "91467.98" volume_24h "72810000000" change_24h_pct "1.99" updated_at "1704384000"
HSET prices:ETHUSDT price "3145.22" volume_24h "18500000000" change_24h_pct "1.53" updated_at "1704384000"

# Expire after 60 seconds (fallback if WS disconnects)
EXPIRE prices:BTCUSDT 60

# ============================================
# PRICE HISTORY FOR % CHANGE CALCULATIONS (Sorted Set)
# ============================================
# Key: price_history:{symbol}:{timeframe}
# Score: timestamp
# Member: price

ZADD price_history:BTCUSDT:5m 1704384000 "91467.98"
ZADD price_history:BTCUSDT:5m 1704384300 "91523.45"

# Keep only last N entries based on timeframe
ZREMRANGEBYRANK price_history:BTCUSDT:5m 0 -100

# ============================================
# USER SESSIONS (String with expiry)
# ============================================
# Key: session:{telegram_id}
# Value: JSON with user data

SET session:123456789 '{"user_id":1,"plan":"pro","expires_at":"2026-02-01"}' EX 86400

# ============================================
# RATE LIMITING (String with expiry)
# ============================================
# Key: ratelimit:{telegram_id}:{endpoint}
# Value: request count

INCR ratelimit:123456789:alerts
EXPIRE ratelimit:123456789:alerts 60

# ============================================
# PUB/SUB CHANNELS
# ============================================
# Channel: triggered_alerts
# Message format: JSON

PUBLISH triggered_alerts '{"alert_id":123,"user_id":456,"coin":"BTC","price":"100234.56","condition":"PRICE_ABOVE","target":"100000"}'

# ============================================
# ACTIVE ALERTS CACHE (Set per coin)
# ============================================
# Key: active_alerts:{binance_symbol}
# Members: alert IDs

SADD active_alerts:BTCUSDT 123 456 789
```

---

## API Endpoints

### Authentication

```
POST /api/v1/auth/telegram
  Description: Validate Telegram InitData and create/update user
  Request:
    {
      "init_data": "query_id=...&user=...&hash=..."
    }
  Response:
    {
      "user": { ... },
      "token": "jwt_token"
    }
```

### Users

```
GET /api/v1/users/me
  Description: Get current user profile
  Response:
    {
      "id": 1,
      "telegram_id": 123456789,
      "username": "johndoe",
      "plan": "pro",
      "plan_expires_at": "2026-02-01T00:00:00Z",
      "notifications_used": 45,
      "notifications_limit": 162,
      "notifications_reset_at": "2026-02-01T00:00:00Z",
      "settings": {
        "notifications_enabled": true,
        "vibration_enabled": true
      },
      "limits": {
        "max_coins": 9,
        "max_alerts": 18,
        "coins_used": 5,
        "alerts_used": 12
      }
    }

PATCH /api/v1/users/me/settings
  Description: Update user settings
  Request:
    {
      "notifications_enabled": true,
      "vibration_enabled": false
    }

DELETE /api/v1/users/me/watchlist
  Description: Delete all coins from watchlist (and their alerts)

DELETE /api/v1/users/me/alerts
  Description: Delete all alerts

DELETE /api/v1/users/me/history
  Description: Clear alert history
```

### Watchlist

```
GET /api/v1/watchlist
  Description: Get user's watchlist with live prices
  Response:
    {
      "items": [
        {
          "id": 1,
          "coin": {
            "symbol": "BTC",
            "name": "Bitcoin",
            "binance_symbol": "BTCUSDT"
          },
          "current_price": "91467.98",
          "price_change_24h_pct": "1.99",
          "volume_24h": "72810000000",
          "market_cap": "1827566600000",
          "sparkline_7d": [89000, 90000, 91000, ...],
          "alerts_count": 3,
          "added_at": "2026-01-01T00:00:00Z"
        }
      ],
      "total": 5,
      "limit": 9
    }

POST /api/v1/watchlist
  Description: Add coin to watchlist
  Request:
    {
      "coin_symbol": "BTC"
    }
  Response:
    {
      "id": 1,
      "coin": { ... },
      "added_at": "2026-01-04T00:00:00Z"
    }
  Errors:
    - 400: "Coin already in watchlist"
    - 403: "Watchlist limit reached. Upgrade to Pro or remove a coin."

DELETE /api/v1/watchlist/{coin_symbol}
  Description: Remove coin from watchlist (also deletes related alerts)
  Response:
    {
      "deleted_alerts_count": 3
    }

GET /api/v1/watchlist/available-coins
  Description: Get list of available coins to add (top 50 by market cap, excluding stablecoins)
  Query params:
    - search: string (optional)
  Response:
    {
      "coins": [
        {
          "symbol": "BTC",
          "name": "Bitcoin",
          "current_price": "91467.98",
          "market_cap": "1827566600000",
          "rank": 1
        }
      ]
    }
```

### Alerts

```
GET /api/v1/alerts
  Description: Get user's alerts
  Query params:
    - coin_symbol: string (optional, filter by coin)
    - status: string (optional: active, paused, all)
  Response:
    {
      "items": [
        {
          "id": 1,
          "coin": {
            "symbol": "BTC",
            "name": "Bitcoin"
          },
          "alert_type": "PRICE_ABOVE",
          "condition": {
            "operator": "above",
            "value": "100000",
            "timeframe": null
          },
          "is_recurring": false,
          "is_paused": false,
          "times_triggered": 0,
          "created_at": "2026-01-01T00:00:00Z"
        }
      ],
      "total": 12,
      "limit": 18,
      "grouped": {
        "BTC": [...],
        "ETH": [...]
      }
    }

POST /api/v1/alerts
  Description: Create new alert
  Request:
    {
      "coin_symbol": "BTC",
      "alert_type": "PRICE_ABOVE",
      "condition_value": "100000",
      "condition_timeframe": null,
      "is_recurring": false
    }
  Response:
    {
      "id": 1,
      "coin": { ... },
      "alert_type": "PRICE_ABOVE",
      "condition": { ... },
      "created_at": "2026-01-04T00:00:00Z"
    }
  Errors:
    - 400: "Coin not in watchlist"
    - 403: "Alert limit reached. Upgrade to Pro or remove an alert."

DELETE /api/v1/alerts/{id}
  Description: Delete alert

PATCH /api/v1/alerts/{id}/pause
  Description: Pause/unpause alert
  Request:
    {
      "is_paused": true
    }
```

### History

```
GET /api/v1/history
  Description: Get alert trigger history
  Query params:
    - coin_symbol: string (optional)
    - alert_type: string (optional)
    - limit: int (default 50)
    - offset: int (default 0)
  Response:
    {
      "items": [
        {
          "id": 1,
          "coin": {
            "symbol": "BTC",
            "name": "Bitcoin"
          },
          "alert_type": "PRICE_ABOVE",
          "condition": {
            "operator": "above",
            "value": "100000"
          },
          "triggered_price": "100234.56",
          "triggered_at": "2026-01-04T15:30:00Z"
        }
      ],
      "total": 45,
      "retention_days": 7
    }
```

### Market

```
GET /api/v1/market/overview
  Description: Get market overview data
  Response:
    {
      "total_market_cap": "3120000000000",
      "total_volume_24h": "72810000000",
      "btc_dominance": "58.5",
      "eth_dominance": "12.2",
      "market_cap_change_24h_pct": "1.87",
      "fear_greed_index": {
        "value": 40,
        "classification": "Fear"
      },
      "top_coins": [
        {
          "symbol": "BTC",
          "name": "Bitcoin",
          "price": "91467.98",
          "change_24h_pct": "1.99",
          "sparkline_7d": [...]
        }
      ],
      "market_cap_chart_30d": [
        { "date": "2025-12-05", "value": "3000000000000" }
      ]
    }
```

### Payments

```
GET /api/v1/payments/plans
  Description: Get available subscription plans
  Response:
    {
      "plans": [
        {
          "name": "pro",
          "limits": {
            "max_coins": 9,
            "max_alerts": 18,
            "max_notifications": 162,
            "history_retention_days": 7
          },
          "price": {
            "monthly": 250,
            "yearly": 2500
          }
        }
      ]
    }

POST /api/v1/payments/create-invoice
  Description: Create Telegram Stars invoice
  Request:
    {
      "plan": "pro",
      "period": "monthly"
    }
  Response:
    {
      "invoice_link": "https://t.me/$..."
    }

POST /api/v1/payments/webhook
  Description: Telegram payment webhook (called by Telegram)

GET /api/v1/payments/history
  Description: Get user's payment history
```

### WebSocket

```
WS /ws/prices
  Description: Real-time price updates for user's watchlist

  Client -> Server (subscribe):
    {
      "action": "subscribe",
      "symbols": ["BTCUSDT", "ETHUSDT"]
    }

  Server -> Client (price update):
    {
      "type": "price",
      "data": {
        "symbol": "BTCUSDT",
        "price": "91467.98",
        "change_24h_pct": "1.99",
        "volume_24h": "72810000000",
        "updated_at": "2026-01-04T15:30:00Z"
      }
    }
```

---

## Frontend Pages

### 1. Watchlist Page

**Route:** `/` (default)

**Components:**
- Header with "Watchlist" title and "Add" button
- Search/filter bar (optional)
- List of coin cards
- Empty state if no coins

**Coin Card (collapsed):**
```
┌─────────────────────────────────────────────────────────────┐
│  ₿ Bitcoin (BTC)                              ▁▂▃▅▆▇ 7d    │
│  $91,467.98                        +1.99% │ Vol: $72.8B    │
└─────────────────────────────────────────────────────────────┘
```

**Coin Card (expanded on tap):**
```
┌─────────────────────────────────────────────────────────────┐
│  ₿ Bitcoin (BTC)                              ▁▂▃▅▆▇ 7d    │
│  $91,467.98                        +1.99% │ Vol: $72.8B    │
├─────────────────────────────────────────────────────────────┤
│  Market Cap: $1.82T                                         │
│  24h High: $92,100   │   24h Low: $89,500                   │
│                                                             │
│  [Remove from Watchlist]                                    │
└─────────────────────────────────────────────────────────────┘
```

**Add Coin Page:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Add Coin                                                 │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search coins...                                         │
├─────────────────────────────────────────────────────────────┤
│  Top 50 by Market Cap                                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ₿ Bitcoin (BTC)              $91,467.98    [+ Add]    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ◊ Ethereum (ETH)             $3,145.22     [+ Add]    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ◈ BNB (BNB)                  $886.50       [+ Add]    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Alerts Page

**Route:** `/alerts`

**Components:**
- Header with "Alerts" title and "Create Alert" button
- Filter tabs: All / Active / Paused
- List of alerts (grouped if >3 per coin)
- Empty state if no alerts

**Alert List:**
```
┌─────────────────────────────────────────────────────────────┐
│  Alerts                                      [+ Create]     │
├─────────────────────────────────────────────────────────────┤
│  [All] [Active] [Paused]                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ₿ BTC │ Price above $100,000         ▶️ │ 🗑️          │ │
│  │       │ One-time                                      │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ₿ BTC │ Price drops 5% in 1h         ⏸️ │ 🗑️          │ │
│  │       │ Recurring                                     │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ◊ ETH │ Price below $3,000           ▶️ │ 🗑️          │ │
│  │       │ One-time                                      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Create Alert Page:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Create Alert                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Select Coin                                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ₿ Bitcoin (BTC)                              ▼        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Alert Type                                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ [Price] [% Change] [Volume] [Market Cap] [Periodic]   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Condition                                                  │
│  ┌─────────────────┐  ┌─────────────────────────────────┐ │
│  │ Goes above  ▼   │  │ $ 100,000                       │ │
│  └─────────────────┘  └─────────────────────────────────┘ │
│                                                             │
│  Current price: $91,467.98                                  │
│                                                             │
│  Behavior                                                   │
│  ○ One-time (delete after trigger)                         │
│  ● Recurring (keep active)                                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    Create Alert                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Alert Types Configuration:**

| Type | Fields |
|------|--------|
| **Price** | Operator (above/below) + Value ($) |
| **% Change** | Direction (up/down) + Percentage + Timeframe (5m/15m/1h/4h/24h) |
| **Volume** | Multiplier (2x/3x/5x/10x) + Timeframe |
| **Market Cap** | Operator (above/below) + Value ($B) |
| **Periodic** | Interval (5m/15m/30m/1h/4h/24h) |

---

### 3. History Page

**Route:** `/history`

**Components:**
- Header with "History" title
- Filter dropdown (All coins / specific coin)
- Filter by alert type
- List of triggered alerts
- Empty state if no history

**History List:**
```
┌─────────────────────────────────────────────────────────────┐
│  History                                                    │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All Coins ▼]  [All Types ▼]                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Today                                                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ₿ BTC │ Price above $100,000         15:30           │ │
│  │       │ Triggered at $100,234.56                      │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ ◊ ETH │ +5% in 1h                    12:45           │ │
│  │       │ Triggered at $3,302.15                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Yesterday                                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ₿ BTC │ Volume spike 5x in 5m        22:15           │ │
│  │       │ Volume: $892M                                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  History retention: 7 days (Pro plan)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Market Page

**Route:** `/market`

**Components:**
- Top coins row (horizontal scroll)
- Fear & Greed Index widget
- Total Market Cap chart
- Bitcoin Dominance widget
- Pull-to-refresh

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Market                                      🔄 (pull)      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ BTC │ │ ETH │ │ BNB │ │ SOL │ │ XRP │  →                │
│  │91.4K│ │3.14K│ │ 886 │ │ 134 │ │2.08 │                   │
│  │+1.9%│ │+1.5%│ │+1.4%│ │+2.7%│ │+3.5%│                   │
│  │ ▁▂▃ │ │ ▂▃▅ │ │ ▁▂▃ │ │ ▃▅▆ │ │ ▂▃▄ │                   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
│                                                             │
│  ┌─────────────────────┐ ┌─────────────────────────────────┐│
│  │ Fear & Greed        │ │ Crypto Market Cap               ││
│  │                     │ │                                 ││
│  │      ╭───╮          │ │ $3.12T        $72.8B           ││
│  │     ╱  40 ╲         │ │ Market Cap    Volume            ││
│  │    ╱ Fear  ╲        │ │                                 ││
│  │   ╱─────────╲       │ │    ╱╲    ╱╲                     ││
│  │                     │ │ ──╱  ╲──╱  ╲──                  ││
│  └─────────────────────┘ │                                 ││
│                          └─────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Bitcoin Dominance                                       ││
│  │                                                         ││
│  │ BTC 58.5%  ████████████████████░░░░░░░░                ││
│  │ ETH 12.2%  ████░░░░░░░░░░░░░░░░░░░░░░░░                ││
│  │ Other 29.3%                                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Profile Page

**Route:** `/profile`

**Components:**
- User info section
- Current plan card
- Settings toggles
- Danger zone (delete actions)
- Support link

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Profile                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 @johndoe                                                │
│  Member since Jan 2026                                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Current Plan: PRO                                     │ │
│  │                                                       │ │
│  │ Coins: 5/9  │  Alerts: 12/18  │  Notif: 45/162       │ │
│  │ ████░░░░░   │  ██████░░░░░░   │  ██░░░░░░░░          │ │
│  │                                                       │ │
│  │ Expires: Feb 1, 2026                                  │ │
│  │                                                       │ │
│  │ [Manage Subscription]                                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Settings                                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Notifications                              [====●]    │ │
│  │ Receive alerts via Telegram                           │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ Vibration                                  [====●]    │ │
│  │ Vibrate on notification                               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Danger Zone                                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ [Delete All Watchlist]                                │ │
│  │ [Delete All Alerts]                                   │ │
│  │ [Clear History]                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Contact Support]                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Subscription Management Page:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Subscription                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Choose Your Plan                                           │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ STANDARD (Current)                            FREE    │ │
│  │ • 3 coins │ 6 alerts │ 18 notif/mo │ 24h history     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ PRO ⭐                                                │ │
│  │ • 9 coins │ 18 alerts │ 162 notif/mo │ 7d history    │ │
│  │                                                       │ │
│  │ Monthly: ⭐ 250        Yearly: ⭐ 2,500 (save 17%)   │ │
│  │                                                       │ │
│  │ [Subscribe Monthly]  [Subscribe Yearly]               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ULTIMATE 👑                                           │ │
│  │ • 27 coins │ 54 alerts │ ∞ notif │ 30d history       │ │
│  │                                                       │ │
│  │ Monthly: ⭐ 750        Yearly: ⭐ 7,500 (save 17%)   │ │
│  │                                                       │ │
│  │ [Subscribe Monthly]  [Subscribe Yearly]               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Bottom Navigation

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   📋          🔔          📜          📊          👤        │
│ Watchlist   Alerts     History     Market     Profile      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Subscription Plans Summary

| Feature | Standard (Free) | Pro (⭐250/mo) | Ultimate (⭐750/mo) |
|---------|-----------------|----------------|---------------------|
| Coins | 3 | 9 | 27 |
| Alerts | 6 | 18 | 54 |
| Notifications/month | 18 | 162 | Unlimited |
| History retention | 24 hours | 7 days | 30 days |
| Yearly price | - | ⭐2,500 (17% off) | ⭐7,500 (17% off) |

**Limit Behavior:**
- Reached limit → Button disabled + upgrade prompt
- Downgrade → Oldest items auto-deleted (with confirmation)
- Coin deleted → Related alerts auto-deleted

---

## Project Structure

```
weqory/
├── frontend/                          # React Telegram Mini App
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api/                       # API client
│   │   │   ├── client.ts              # Axios instance
│   │   │   ├── auth.ts
│   │   │   ├── watchlist.ts
│   │   │   ├── alerts.ts
│   │   │   ├── history.ts
│   │   │   ├── market.ts
│   │   │   └── payments.ts
│   │   ├── components/                # Reusable components
│   │   │   ├── ui/                    # Base UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Toggle.tsx
│   │   │   │   └── Spinner.tsx
│   │   │   ├── CoinCard.tsx
│   │   │   ├── AlertCard.tsx
│   │   │   ├── HistoryItem.tsx
│   │   │   ├── Sparkline.tsx
│   │   │   ├── FearGreedGauge.tsx
│   │   │   ├── MarketCapChart.tsx
│   │   │   ├── DominanceBar.tsx
│   │   │   ├── PlanCard.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── pages/                     # Page components
│   │   │   ├── Watchlist/
│   │   │   │   ├── index.tsx
│   │   │   │   └── AddCoin.tsx
│   │   │   ├── Alerts/
│   │   │   │   ├── index.tsx
│   │   │   │   └── CreateAlert.tsx
│   │   │   ├── History/
│   │   │   │   └── index.tsx
│   │   │   ├── Market/
│   │   │   │   └── index.tsx
│   │   │   └── Profile/
│   │   │       ├── index.tsx
│   │   │       └── Subscription.tsx
│   │   ├── hooks/                     # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useTelegram.ts
│   │   │   └── useTheme.ts
│   │   ├── store/                     # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── watchlistStore.ts
│   │   │   ├── alertsStore.ts
│   │   │   └── pricesStore.ts
│   │   ├── types/                     # TypeScript types
│   │   │   ├── user.ts
│   │   │   ├── coin.ts
│   │   │   ├── alert.ts
│   │   │   └── api.ts
│   │   ├── utils/                     # Utility functions
│   │   │   ├── formatters.ts          # Price, date formatting
│   │   │   ├── validators.ts
│   │   │   └── constants.ts
│   │   ├── styles/
│   │   │   └── globals.css            # TailwindCSS
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
│
├── backend/
│   ├── api-gateway/                   # API Gateway Service
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   │   └── config.go
│   │   │   ├── handlers/              # HTTP handlers
│   │   │   │   ├── auth.go
│   │   │   │   ├── users.go
│   │   │   │   ├── watchlist.go
│   │   │   │   ├── alerts.go
│   │   │   │   ├── history.go
│   │   │   │   ├── market.go
│   │   │   │   ├── payments.go
│   │   │   │   └── websocket.go
│   │   │   ├── middleware/
│   │   │   │   ├── auth.go
│   │   │   │   ├── ratelimit.go
│   │   │   │   └── cors.go
│   │   │   ├── services/              # Business logic
│   │   │   │   ├── user_service.go
│   │   │   │   ├── watchlist_service.go
│   │   │   │   ├── alert_service.go
│   │   │   │   ├── history_service.go
│   │   │   │   ├── market_service.go
│   │   │   │   └── payment_service.go
│   │   │   └── ws/                    # WebSocket hub
│   │   │       ├── hub.go
│   │   │       └── client.go
│   │   ├── pkg/
│   │   │   ├── telegram/              # Telegram utilities
│   │   │   │   └── initdata.go        # InitData validation
│   │   │   └── response/
│   │   │       └── response.go
│   │   ├── go.mod
│   │   ├── go.sum
│   │   └── Dockerfile
│   │
│   ├── alert-engine/                  # Alert Engine Service
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   │   └── config.go
│   │   │   ├── binance/               # Binance WebSocket client
│   │   │   │   ├── client.go
│   │   │   │   └── types.go
│   │   │   ├── checker/               # Alert condition checker
│   │   │   │   ├── checker.go
│   │   │   │   ├── price.go
│   │   │   │   ├── percent.go
│   │   │   │   ├── volume.go
│   │   │   │   ├── marketcap.go
│   │   │   │   └── periodic.go
│   │   │   ├── cache/                 # Price cache manager
│   │   │   │   └── price_cache.go
│   │   │   └── publisher/             # Redis publisher
│   │   │       └── publisher.go
│   │   ├── go.mod
│   │   ├── go.sum
│   │   └── Dockerfile
│   │
│   ├── notification-service/          # Notification Service
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   │   └── config.go
│   │   │   ├── consumer/              # Redis subscriber
│   │   │   │   └── consumer.go
│   │   │   ├── telegram/              # Telegram bot
│   │   │   │   ├── bot.go
│   │   │   │   └── templates.go       # Message templates
│   │   │   ├── limiter/               # Rate limiter
│   │   │   │   └── limiter.go
│   │   │   └── history/               # History writer
│   │   │       └── writer.go
│   │   ├── go.mod
│   │   ├── go.sum
│   │   └── Dockerfile
│   │
│   └── shared/                        # Shared packages
│       ├── database/
│       │   ├── postgres.go
│       │   ├── redis.go
│       │   └── queries/               # sqlc generated
│       │       ├── models.go
│       │       ├── users.sql.go
│       │       ├── watchlist.sql.go
│       │       ├── alerts.sql.go
│       │       └── history.sql.go
│       ├── models/                    # Shared models
│       │   ├── user.go
│       │   ├── coin.go
│       │   ├── alert.go
│       │   └── history.go
│       └── utils/
│           ├── logger.go
│           └── validator.go
│
├── database/
│   ├── migrations/                    # SQL migrations
│   │   ├── 001_create_users.up.sql
│   │   ├── 001_create_users.down.sql
│   │   ├── 002_create_coins.up.sql
│   │   ├── 002_create_coins.down.sql
│   │   ├── 003_create_watchlist.up.sql
│   │   ├── 003_create_watchlist.down.sql
│   │   ├── 004_create_alerts.up.sql
│   │   ├── 004_create_alerts.down.sql
│   │   ├── 005_create_history.up.sql
│   │   ├── 005_create_history.down.sql
│   │   ├── 006_create_payments.up.sql
│   │   ├── 006_create_payments.down.sql
│   │   └── 007_create_plans.up.sql
│   ├── sqlc.yaml                      # sqlc configuration
│   └── queries/                       # SQL queries for sqlc
│       ├── users.sql
│       ├── coins.sql
│       ├── watchlist.sql
│       ├── alerts.sql
│       ├── history.sql
│       └── payments.sql
│
├── docker/
│   └── docker-compose.yml             # Local development
│
├── .github/
│   └── workflows/
│       ├── frontend.yml               # Frontend CI/CD
│       └── backend.yml                # Backend CI/CD
│
├── docs/
│   └── api.md                         # API documentation
│
├── .gitignore
├── README.md
└── WEQORY_PROJECT_PLAN.md            # This file
```

---

## Development Phases

### Phase 1: Foundation
- [ ] Initialize project structure
- [ ] Set up PostgreSQL database + migrations
- [ ] Set up Redis
- [ ] Create shared Go packages (database, models)
- [ ] Set up React project with Vite + TypeScript + TailwindCSS
- [ ] Integrate Telegram Mini App SDK
- [ ] Implement dark theme

### Phase 2: API Gateway
- [ ] Set up Fiber HTTP server
- [ ] Implement Telegram InitData authentication
- [ ] Create user registration/login flow
- [ ] Implement watchlist CRUD endpoints
- [ ] Implement alerts CRUD endpoints
- [ ] Implement history endpoints
- [ ] Implement WebSocket server for live prices
- [ ] Add rate limiting

### Phase 3: Alert Engine
- [ ] Connect to Binance WebSocket
- [ ] Implement price cache in Redis
- [ ] Load active alerts from database
- [ ] Implement alert condition checkers:
  - [ ] Price above/below
  - [ ] Price change %
  - [ ] Volume change
  - [ ] Market cap
  - [ ] Periodic
- [ ] Publish triggered alerts to Redis

### Phase 4: Notification Service
- [ ] Set up Telegram bot
- [ ] Subscribe to Redis triggered alerts
- [ ] Implement notification limits checker
- [ ] Format and send Telegram messages
- [ ] Handle one-time vs recurring alerts
- [ ] Save to history

### Phase 5: Frontend - Core Pages
- [ ] Bottom navigation
- [ ] Watchlist page
  - [ ] Coin list with live prices
  - [ ] Add coin page
  - [ ] Remove coin
- [ ] Alerts page
  - [ ] Alert list (grouped)
  - [ ] Create alert page
  - [ ] Pause/delete alert
- [ ] History page
  - [ ] History list
  - [ ] Filters

### Phase 6: Frontend - Market & Profile
- [ ] Market page
  - [ ] Top coins
  - [ ] Fear & Greed Index
  - [ ] Market cap chart
  - [ ] Dominance bar
- [ ] Profile page
  - [ ] User info
  - [ ] Settings toggles
  - [ ] Danger zone
  - [ ] Subscription management

### Phase 7: Payments
- [ ] Implement Telegram Stars invoice creation
- [ ] Handle payment webhooks
- [ ] Update user plan on successful payment
- [ ] Implement downgrade logic
- [ ] Test payment flow

### Phase 8: Polish & Testing
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Animations
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing

### Phase 9: Deployment
- [ ] Set up Render services
- [ ] Configure environment variables
- [ ] Set up CI/CD pipelines
- [ ] Deploy database
- [ ] Deploy Redis
- [ ] Deploy backend services
- [ ] Deploy frontend
- [ ] Configure domain
- [ ] Set up monitoring

### Phase 10: Launch
- [ ] Create Telegram bot with BotFather
- [ ] Configure Mini App in BotFather
- [ ] Final testing in production
- [ ] Soft launch
- [ ] Monitor and fix issues
- [ ] Public launch

---

## Environment Variables

### API Gateway
```env
# Server
PORT=8080
ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/weqory

# Redis
REDIS_URL=redis://host:6379

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_MINI_APP_URL=https://your-frontend.com

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=24h

# CoinGecko
COINGECKO_API_KEY=your_api_key (optional for higher limits)
```

### Alert Engine
```env
# Server
PORT=8081
ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/weqory

# Redis
REDIS_URL=redis://host:6379

# Binance
BINANCE_WS_URL=wss://stream.binance.com:9443/ws
```

### Notification Service
```env
# Server
PORT=8082
ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/weqory

# Redis
REDIS_URL=redis://host:6379

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
```

### Frontend
```env
VITE_API_URL=https://api.weqory.com
VITE_WS_URL=wss://api.weqory.com/ws
```

---

## Security Considerations

1. **Telegram InitData Validation** — Always validate InitData hash on backend
2. **Rate Limiting** — Prevent abuse with per-user rate limits
3. **Input Validation** — Validate all user inputs
4. **SQL Injection** — Using sqlc with parameterized queries
5. **XSS Prevention** — React escapes by default
6. **HTTPS Only** — All traffic over HTTPS
7. **Environment Variables** — No secrets in code
8. **JWT Expiry** — Short-lived tokens with refresh

---

## Monitoring & Logging

- **Logs:** Structured JSON logging
- **Metrics:** Prometheus + Grafana (optional)
- **Alerts:** Service health checks
- **Error Tracking:** Sentry (optional)

---

## Future Enhancements (Post-MVP)

- [ ] Compound alerts (multiple conditions)
- [ ] Whale alerts (large transactions)
- [ ] Portfolio tracking
- [ ] Price predictions
- [ ] Social features (share alerts)
- [ ] More exchanges (Coinbase, Kraken)
- [ ] Technical indicators (RSI, MACD)
- [ ] Multi-language support
- [ ] Desktop notifications (PWA)
- [ ] API for third-party integrations

---

*Document created: January 4, 2026*
*Last updated: January 4, 2026*
