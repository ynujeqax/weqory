-- Coins table (cached from Binance/CoinGecko)
CREATE TABLE coins (
    id                    SERIAL PRIMARY KEY,
    symbol                VARCHAR(20) UNIQUE NOT NULL,
    name                  VARCHAR(100) NOT NULL,
    binance_symbol        VARCHAR(20) NOT NULL,
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

-- Indexes
CREATE INDEX idx_coins_symbol ON coins(symbol);
CREATE INDEX idx_coins_binance_symbol ON coins(binance_symbol);
CREATE INDEX idx_coins_rank ON coins(rank_by_market_cap);
CREATE INDEX idx_coins_not_stablecoin ON coins(id) WHERE is_stablecoin = false;

-- Insert initial top coins
INSERT INTO coins (symbol, name, binance_symbol, rank_by_market_cap) VALUES
    ('BTC', 'Bitcoin', 'BTCUSDT', 1),
    ('ETH', 'Ethereum', 'ETHUSDT', 2),
    ('BNB', 'BNB', 'BNBUSDT', 3),
    ('SOL', 'Solana', 'SOLUSDT', 4),
    ('XRP', 'XRP', 'XRPUSDT', 5),
    ('DOGE', 'Dogecoin', 'DOGEUSDT', 6),
    ('ADA', 'Cardano', 'ADAUSDT', 7),
    ('AVAX', 'Avalanche', 'AVAXUSDT', 8),
    ('SHIB', 'Shiba Inu', 'SHIBUSDT', 9),
    ('DOT', 'Polkadot', 'DOTUSDT', 10),
    ('LINK', 'Chainlink', 'LINKUSDT', 11),
    ('TRX', 'TRON', 'TRXUSDT', 12),
    ('MATIC', 'Polygon', 'MATICUSDT', 13),
    ('UNI', 'Uniswap', 'UNIUSDT', 14),
    ('LTC', 'Litecoin', 'LTCUSDT', 15),
    ('ATOM', 'Cosmos', 'ATOMUSDT', 16),
    ('XLM', 'Stellar', 'XLMUSDT', 17),
    ('ETC', 'Ethereum Classic', 'ETCUSDT', 18),
    ('FIL', 'Filecoin', 'FILUSDT', 19),
    ('APT', 'Aptos', 'APTUSDT', 20);

-- Insert stablecoins (excluded from watchlist)
-- Note: Stablecoins don't have direct trading pairs, they're used as quote currency
INSERT INTO coins (symbol, name, binance_symbol, is_stablecoin) VALUES
    ('USDT', 'Tether', 'USDT', true),
    ('USDC', 'USD Coin', 'USDC', true),
    ('DAI', 'Dai', 'DAI', true),
    ('BUSD', 'Binance USD', 'BUSD', true);
