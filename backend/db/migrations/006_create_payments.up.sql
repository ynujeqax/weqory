-- Payments table
CREATE TABLE payments (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Telegram Stars payment
    telegram_payment_id   VARCHAR(255) UNIQUE,

    -- Plan info
    plan                  VARCHAR(20) NOT NULL CHECK (plan IN ('pro', 'ultimate')),
    period                VARCHAR(10) NOT NULL CHECK (period IN ('monthly', 'yearly')),

    -- Amount
    stars_amount          INTEGER NOT NULL,

    -- Status
    status                VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),

    -- Timestamps
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at          TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_telegram_id ON payments(telegram_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
