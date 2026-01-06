-- Alert history table
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

-- Indexes
CREATE INDEX idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX idx_alert_history_coin_id ON alert_history(coin_id);
CREATE INDEX idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX idx_alert_history_triggered_at ON alert_history(triggered_at DESC);
CREATE INDEX idx_alert_history_user_triggered ON alert_history(user_id, triggered_at DESC);
