-- Watchlist table
CREATE TABLE watchlist (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coin_id               INTEGER NOT NULL REFERENCES coins(id) ON DELETE CASCADE,

    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, coin_id)
);

-- Indexes
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_coin_id ON watchlist(coin_id);
