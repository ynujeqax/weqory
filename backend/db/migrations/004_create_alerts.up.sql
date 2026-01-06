-- Alerts table
CREATE TABLE alerts (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coin_id               INTEGER NOT NULL REFERENCES coins(id) ON DELETE CASCADE,

    -- Alert configuration
    alert_type            VARCHAR(30) NOT NULL CHECK (alert_type IN (
        'PRICE_ABOVE', 'PRICE_BELOW', 'PRICE_CHANGE_PCT',
        'VOLUME_CHANGE_PCT', 'VOLUME_SPIKE',
        'MARKET_CAP_ABOVE', 'MARKET_CAP_BELOW', 'PERIODIC'
    )),

    condition_operator    VARCHAR(10) NOT NULL CHECK (condition_operator IN ('above', 'below', 'change')),
    condition_value       DECIMAL(30, 10) NOT NULL,
    condition_timeframe   VARCHAR(20) CHECK (condition_timeframe IN ('5m', '15m', '30m', '1h', '4h', '24h')),

    -- Behavior
    is_recurring          BOOLEAN DEFAULT false,
    is_paused             BOOLEAN DEFAULT false,

    -- For periodic alerts
    periodic_interval     VARCHAR(20) CHECK (periodic_interval IN ('5m', '15m', '30m', '1h', '4h', '24h')),

    -- Tracking
    times_triggered       INTEGER DEFAULT 0,
    last_triggered_at     TIMESTAMP WITH TIME ZONE,
    price_when_created    DECIMAL(30, 10),

    -- Timestamps
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_coin_id ON alerts(coin_id);
CREATE INDEX idx_alerts_active ON alerts(coin_id) WHERE is_paused = false;
CREATE INDEX idx_alerts_user_active ON alerts(user_id) WHERE is_paused = false;
CREATE INDEX idx_alerts_type ON alerts(alert_type);

-- Trigger for updated_at
CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
