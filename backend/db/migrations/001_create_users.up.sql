-- Users table
CREATE TABLE users (
    id                    BIGSERIAL PRIMARY KEY,
    telegram_id           BIGINT UNIQUE NOT NULL,
    username              VARCHAR(255),
    first_name            VARCHAR(255),
    last_name             VARCHAR(255),
    language_code         VARCHAR(10) DEFAULT 'en',

    -- Subscription
    plan                  VARCHAR(20) DEFAULT 'standard' CHECK (plan IN ('standard', 'pro', 'ultimate')),
    plan_expires_at       TIMESTAMP WITH TIME ZONE,
    plan_period           VARCHAR(10) CHECK (plan_period IN ('monthly', 'yearly')),

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

-- Indexes
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_last_active ON users(last_active_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
