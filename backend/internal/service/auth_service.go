package service

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/weqory/backend/pkg/crypto"
	"github.com/weqory/backend/pkg/errors"
)

// AuthService handles authentication logic
type AuthService struct {
	userService *UserService
	jwtSecret   string
	jwtExpiry   time.Duration
	botToken    string
}

// NewAuthService creates a new AuthService
func NewAuthService(userService *UserService, jwtSecret, botToken string, jwtExpiry time.Duration) *AuthService {
	return &AuthService{
		userService: userService,
		jwtSecret:   jwtSecret,
		jwtExpiry:   jwtExpiry,
		botToken:    botToken,
	}
}

// JWTClaims represents JWT token claims
type JWTClaims struct {
	UserID     int64 `json:"user_id"`
	TelegramID int64 `json:"telegram_id"`
	jwt.RegisteredClaims
}

// AuthResult represents authentication result
type AuthResult struct {
	User  *UserWithLimits
	Token string
}

// Authenticate validates Telegram InitData and returns user with JWT token
func (s *AuthService) Authenticate(ctx context.Context, initData string) (*AuthResult, error) {
	// Validate InitData
	data, err := crypto.ValidateInitData(initData, s.botToken)
	if err != nil {
		return nil, err
	}

	if data.User == nil {
		return nil, errors.ErrInvalidInitData.WithMessage("missing user data")
	}

	// Get or create user
	user, err := s.userService.GetOrCreateByTelegramID(ctx, data.User)
	if err != nil {
		return nil, err
	}

	// Generate JWT token
	token, err := s.generateToken(user.ID, user.TelegramID)
	if err != nil {
		return nil, errors.ErrInternal.WithCause(err)
	}

	return &AuthResult{
		User:  user,
		Token: token,
	}, nil
}

// ValidateToken validates a JWT token and returns claims
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.ErrInvalidToken
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, errors.ErrInvalidToken.WithCause(err)
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.ErrInvalidToken
	}

	return claims, nil
}

// generateToken generates a new JWT token
func (s *AuthService) generateToken(userID, telegramID int64) (string, error) {
	now := time.Now()
	claims := &JWTClaims{
		UserID:     userID,
		TelegramID: telegramID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.jwtExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "weqory",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}
