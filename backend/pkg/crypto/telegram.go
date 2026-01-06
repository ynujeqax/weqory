package crypto

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/weqory/backend/pkg/errors"
)

const (
	// InitDataExpiry is the maximum age of init data (24 hours)
	InitDataExpiry = 24 * time.Hour
)

// TelegramUser represents a Telegram user from InitData
type TelegramUser struct {
	ID           int64  `json:"id"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name,omitempty"`
	Username     string `json:"username,omitempty"`
	LanguageCode string `json:"language_code,omitempty"`
	IsPremium    bool   `json:"is_premium,omitempty"`
	PhotoURL     string `json:"photo_url,omitempty"`
}

// InitData represents parsed Telegram InitData
type InitData struct {
	QueryID      string        `json:"query_id,omitempty"`
	User         *TelegramUser `json:"user,omitempty"`
	AuthDate     int64         `json:"auth_date"`
	Hash         string        `json:"hash"`
	StartParam   string        `json:"start_param,omitempty"`
}

// ValidateInitData validates Telegram Mini App InitData
// See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
func ValidateInitData(initData string, botToken string) (*InitData, error) {
	if initData == "" {
		return nil, errors.ErrInvalidInitData
	}

	// Parse the query string
	values, err := url.ParseQuery(initData)
	if err != nil {
		return nil, errors.ErrInvalidInitData.WithCause(err)
	}

	// Extract and verify auth_date
	authDateStr := values.Get("auth_date")
	authDate, err := strconv.ParseInt(authDateStr, 10, 64)
	if err != nil {
		return nil, errors.ErrInvalidInitData.WithMessage("invalid auth_date")
	}

	// Check if auth_date is not too old
	if time.Now().Unix()-authDate > int64(InitDataExpiry.Seconds()) {
		return nil, errors.ErrExpiredInitData
	}

	// Extract hash
	hash := values.Get("hash")
	if hash == "" {
		return nil, errors.ErrInvalidInitData.WithMessage("missing hash")
	}

	// Remove hash from values for verification
	values.Del("hash")

	// Build data-check-string
	dataCheckString := buildDataCheckString(values)

	// Calculate expected hash
	expectedHash := calculateHash(dataCheckString, botToken)

	// Compare hashes
	if !hmac.Equal([]byte(hash), []byte(expectedHash)) {
		return nil, errors.ErrInvalidInitData.WithMessage("invalid hash")
	}

	// Parse user data
	result := &InitData{
		AuthDate:   authDate,
		Hash:       hash,
		QueryID:    values.Get("query_id"),
		StartParam: values.Get("start_param"),
	}

	// Parse user JSON
	userStr := values.Get("user")
	if userStr != "" {
		var user TelegramUser
		if err := json.Unmarshal([]byte(userStr), &user); err != nil {
			return nil, errors.ErrInvalidInitData.WithCause(err).WithMessage("invalid user data")
		}
		result.User = &user
	}

	return result, nil
}

// buildDataCheckString builds the data-check-string for hash verification
func buildDataCheckString(values url.Values) string {
	// Get sorted keys
	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Build string
	var parts []string
	for _, k := range keys {
		v := values.Get(k)
		if v != "" {
			parts = append(parts, fmt.Sprintf("%s=%s", k, v))
		}
	}

	return strings.Join(parts, "\n")
}

// calculateHash calculates the HMAC-SHA256 hash for verification
func calculateHash(dataCheckString, botToken string) string {
	// Create secret key using HMAC-SHA256 of bot token with "WebAppData"
	secretKey := hmac.New(sha256.New, []byte("WebAppData"))
	secretKey.Write([]byte(botToken))

	// Calculate hash
	h := hmac.New(sha256.New, secretKey.Sum(nil))
	h.Write([]byte(dataCheckString))

	return hex.EncodeToString(h.Sum(nil))
}

// GenerateTestInitData generates test InitData for development
// WARNING: Only use in development/testing environments
func GenerateTestInitData(user *TelegramUser, botToken string) string {
	authDate := time.Now().Unix()

	userJSON, _ := json.Marshal(user)

	values := url.Values{}
	values.Set("auth_date", strconv.FormatInt(authDate, 10))
	values.Set("user", string(userJSON))
	values.Set("query_id", "test_query_id")

	dataCheckString := buildDataCheckString(values)
	hash := calculateHash(dataCheckString, botToken)

	values.Set("hash", hash)

	return values.Encode()
}
