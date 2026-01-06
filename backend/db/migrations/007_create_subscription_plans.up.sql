-- Subscription plans reference table
CREATE TABLE subscription_plans (
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(20) UNIQUE NOT NULL CHECK (name IN ('standard', 'pro', 'ultimate')),

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
