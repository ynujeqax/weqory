package errors

import (
	"errors"
	"fmt"
	"net/http"
)

// Standard errors
var (
	// Authentication errors
	ErrUnauthorized     = New("unauthorized", http.StatusUnauthorized)
	ErrInvalidToken     = New("invalid token", http.StatusUnauthorized)
	ErrExpiredToken     = New("token expired", http.StatusUnauthorized)
	ErrInvalidInitData  = New("invalid telegram init data", http.StatusUnauthorized)
	ErrExpiredInitData  = New("telegram init data expired", http.StatusUnauthorized)

	// Authorization errors
	ErrForbidden        = New("forbidden", http.StatusForbidden)
	ErrNotOwner         = New("not the owner of this resource", http.StatusForbidden)

	// Not found errors
	ErrNotFound         = New("resource not found", http.StatusNotFound)
	ErrUserNotFound     = New("user not found", http.StatusNotFound)
	ErrCoinNotFound     = New("coin not found", http.StatusNotFound)
	ErrAlertNotFound    = New("alert not found", http.StatusNotFound)
	ErrPlanNotFound     = New("plan not found", http.StatusNotFound)
	ErrCoinNotInWatchlist = New("coin not in watchlist", http.StatusNotFound)

	// Validation errors
	ErrBadRequest       = New("bad request", http.StatusBadRequest)
	ErrInvalidInput     = New("invalid input", http.StatusBadRequest)
	ErrValidationFailed = New("validation failed", http.StatusBadRequest)

	// Conflict errors
	ErrConflict         = New("resource already exists", http.StatusConflict)
	ErrAlreadyExists    = New("already exists", http.StatusConflict)
	ErrCoinInWatchlist  = New("coin already in watchlist", http.StatusConflict)
	ErrCoinAlreadyInWatchlist = New("coin already in watchlist", http.StatusConflict)

	// Limit errors
	ErrLimitExceeded        = New("limit exceeded", http.StatusForbidden)
	ErrWatchlistLimitExceeded = New("watchlist limit exceeded", http.StatusForbidden)
	ErrAlertLimitExceeded     = New("alert limit exceeded", http.StatusForbidden)
	ErrNotificationLimitExceeded = New("notification limit exceeded", http.StatusForbidden)

	// Rate limiting
	ErrTooManyRequests = New("too many requests", http.StatusTooManyRequests)

	// Internal errors
	ErrInternal        = New("internal server error", http.StatusInternalServerError)
	ErrDatabase        = New("database error", http.StatusInternalServerError)
	ErrRedis           = New("redis error", http.StatusInternalServerError)
	ErrExternalService = New("external service error", http.StatusBadGateway)
)

// AppError represents an application error with HTTP status code
type AppError struct {
	Message    string `json:"error"`
	StatusCode int    `json:"-"`
	Details    any    `json:"details,omitempty"`
	cause      error
}

// New creates a new AppError
func New(message string, statusCode int) *AppError {
	return &AppError{
		Message:    message,
		StatusCode: statusCode,
	}
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.cause != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.cause)
	}
	return e.Message
}

// Unwrap returns the underlying error
func (e *AppError) Unwrap() error {
	return e.cause
}

// WithCause adds a cause to the error
func (e *AppError) WithCause(cause error) *AppError {
	return &AppError{
		Message:    e.Message,
		StatusCode: e.StatusCode,
		Details:    e.Details,
		cause:      cause,
	}
}

// WithDetails adds details to the error
func (e *AppError) WithDetails(details any) *AppError {
	return &AppError{
		Message:    e.Message,
		StatusCode: e.StatusCode,
		Details:    details,
		cause:      e.cause,
	}
}

// WithMessage creates a copy with a new message
func (e *AppError) WithMessage(message string) *AppError {
	return &AppError{
		Message:    message,
		StatusCode: e.StatusCode,
		Details:    e.Details,
		cause:      e.cause,
	}
}

// Is checks if the target error is the same as this error
func (e *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	if !ok {
		return false
	}
	return e.Message == t.Message && e.StatusCode == t.StatusCode
}

// IsAppError checks if an error is an AppError
func IsAppError(err error) bool {
	var appErr *AppError
	return errors.As(err, &appErr)
}

// GetStatusCode returns the HTTP status code for an error
func GetStatusCode(err error) int {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.StatusCode
	}
	return http.StatusInternalServerError
}

// Wrap wraps an error with an AppError
func Wrap(err error, appErr *AppError) *AppError {
	if err == nil {
		return nil
	}
	return appErr.WithCause(err)
}

// Is reports whether any error in err's chain matches target.
// This is a wrapper around the standard library's errors.Is
func Is(err, target error) bool {
	return errors.Is(err, target)
}

// As finds the first error in err's chain that matches target.
// This is a wrapper around the standard library's errors.As
func As(err error, target any) bool {
	return errors.As(err, target)
}
