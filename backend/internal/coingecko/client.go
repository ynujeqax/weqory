package coingecko

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"
)

const (
	baseURL        = "https://api.coingecko.com/api/v3"
	defaultTimeout = 30 * time.Second
)

// Client is a CoinGecko API client
type Client struct {
	httpClient *http.Client
	apiKey     string
	logger     *slog.Logger
}

// NewClient creates a new CoinGecko client
func NewClient(apiKey string, logger *slog.Logger) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
		apiKey: apiKey,
		logger: logger,
	}
}

// CoinMarket represents coin market data from CoinGecko
type CoinMarket struct {
	ID                       string  `json:"id"`
	Symbol                   string  `json:"symbol"`
	Name                     string  `json:"name"`
	Image                    string  `json:"image"`
	CurrentPrice             float64 `json:"current_price"`
	MarketCap                float64 `json:"market_cap"`
	MarketCapRank            int     `json:"market_cap_rank"`
	TotalVolume              float64 `json:"total_volume"`
	High24h                  float64 `json:"high_24h"`
	Low24h                   float64 `json:"low_24h"`
	PriceChange24h           float64 `json:"price_change_24h"`
	PriceChangePercentage24h float64 `json:"price_change_percentage_24h"`
	CirculatingSupply        float64 `json:"circulating_supply"`
	TotalSupply              float64 `json:"total_supply"`
	ATH                      float64 `json:"ath"`
	ATHChangePercentage      float64 `json:"ath_change_percentage"`
	ATHDate                  string  `json:"ath_date"`
	LastUpdated              string  `json:"last_updated"`
}

// GetCoinsMarkets fetches coin market data
// vsCurrency: "usd"
// perPage: 1-250
// page: 1, 2, 3...
func (c *Client) GetCoinsMarkets(ctx context.Context, vsCurrency string, perPage, page int) ([]CoinMarket, error) {
	params := url.Values{}
	params.Set("vs_currency", vsCurrency)
	params.Set("order", "market_cap_desc")
	params.Set("per_page", fmt.Sprintf("%d", perPage))
	params.Set("page", fmt.Sprintf("%d", page))
	params.Set("sparkline", "false")
	params.Set("price_change_percentage", "24h")

	endpoint := fmt.Sprintf("%s/coins/markets?%s", baseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	// Add API key header if available (for higher rate limits)
	if c.apiKey != "" {
		req.Header.Set("x-cg-demo-api-key", c.apiKey)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("rate limit exceeded")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var coins []CoinMarket
	if err := json.NewDecoder(resp.Body).Decode(&coins); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return coins, nil
}

// GlobalData represents global market data
type GlobalData struct {
	Data struct {
		ActiveCryptocurrencies          int                `json:"active_cryptocurrencies"`
		Markets                         int                `json:"markets"`
		TotalMarketCap                  map[string]float64 `json:"total_market_cap"`
		TotalVolume                     map[string]float64 `json:"total_volume"`
		MarketCapPercentage             map[string]float64 `json:"market_cap_percentage"`
		MarketCapChangePercentage24hUSD float64            `json:"market_cap_change_percentage_24h_usd"`
	} `json:"data"`
}

// GetGlobalData fetches global market data
func (c *Client) GetGlobalData(ctx context.Context) (*GlobalData, error) {
	endpoint := fmt.Sprintf("%s/global", baseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	if c.apiKey != "" {
		req.Header.Set("x-cg-demo-api-key", c.apiKey)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("rate limit exceeded")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var data GlobalData
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &data, nil
}

// BinanceSymbolMap maps common symbols to Binance trading pairs
var BinanceSymbolMap = map[string]string{
	"btc":   "BTCUSDT",
	"eth":   "ETHUSDT",
	"bnb":   "BNBUSDT",
	"sol":   "SOLUSDT",
	"xrp":   "XRPUSDT",
	"doge":  "DOGEUSDT",
	"ada":   "ADAUSDT",
	"avax":  "AVAXUSDT",
	"shib":  "SHIBUSDT",
	"dot":   "DOTUSDT",
	"link":  "LINKUSDT",
	"trx":   "TRXUSDT",
	"matic": "MATICUSDT",
	"uni":   "UNIUSDT",
	"ltc":   "LTCUSDT",
	"atom":  "ATOMUSDT",
	"xlm":   "XLMUSDT",
	"etc":   "ETCUSDT",
	"fil":   "FILUSDT",
	"apt":   "APTUSDT",
	"near":  "NEARUSDT",
	"arb":   "ARBUSDT",
	"op":    "OPUSDT",
	"sui":   "SUIUSDT",
	"sei":   "SEIUSDT",
	"inj":   "INJUSDT",
	"ftm":   "FTMUSDT",
	"algo":  "ALGOUSDT",
	"vet":   "VETUSDT",
	"sand":  "SANDUSDT",
	"mana":  "MANAUSDT",
	"axs":   "AXSUSDT",
	"aave":  "AAVEUSDT",
	"mkr":   "MKRUSDT",
	"snx":   "SNXUSDT",
	"crv":   "CRVUSDT",
	"comp":  "COMPUSDT",
	"ldo":   "LDOUSDT",
	"rpl":   "RPLUSDT",
	"grt":   "GRTUSDT",
	"ens":   "ENSUSDT",
	"pepe":  "PEPEUSDT",
	"wif":   "WIFUSDT",
	"bonk":  "BONKUSDT",
	"floki": "FLOKIUSDT",
	"ton":   "TONUSDT",
	"kas":   "KASUSDT",
	"ren":   "RENUSDT",
	"1inch": "1INCHUSDT",
	"sushi": "SUSHIUSDT",
	"cake":  "CAKEUSDT",
}

// GetBinanceSymbol returns Binance trading pair for a symbol
func GetBinanceSymbol(symbol string) string {
	if binanceSymbol, ok := BinanceSymbolMap[symbol]; ok {
		return binanceSymbol
	}
	// Default: uppercase symbol + USDT
	return fmt.Sprintf("%sUSDT", symbol)
}

// IsStablecoin checks if a symbol is a stablecoin
func IsStablecoin(symbol string) bool {
	stablecoins := map[string]bool{
		"usdt":  true,
		"usdc":  true,
		"dai":   true,
		"busd":  true,
		"tusd":  true,
		"usdp":  true,
		"frax":  true,
		"usdd":  true,
		"gusd":  true,
		"paxg":  true,
		"xaut":  true,
		"fdusd": true,
	}
	return stablecoins[symbol]
}
