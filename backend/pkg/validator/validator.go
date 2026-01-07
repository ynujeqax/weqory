package validator

import (
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

// Validator wraps the go-playground validator
type Validator struct {
	validate *validator.Validate
}

// ValidationError represents a validation error for a single field
type ValidationError struct {
	Field   string `json:"field"`
	Tag     string `json:"tag"`
	Value   string `json:"value,omitempty"`
	Message string `json:"message"`
}

// New creates a new Validator instance
func New() *Validator {
	v := validator.New()

	// Use JSON tag names in error messages
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	// Register custom validations
	_ = v.RegisterValidation("coin_symbol", validateCoinSymbol)
	_ = v.RegisterValidation("alert_type", validateAlertType)
	_ = v.RegisterValidation("plan", validatePlan)
	_ = v.RegisterValidation("timeframe", validateTimeframe)

	return &Validator{validate: v}
}

// Validate validates a struct and returns validation errors
func (v *Validator) Validate(i interface{}) []ValidationError {
	err := v.validate.Struct(i)
	if err == nil {
		return nil
	}

	var errors []ValidationError
	for _, err := range err.(validator.ValidationErrors) {
		errors = append(errors, ValidationError{
			Field:   err.Field(),
			Tag:     err.Tag(),
			Value:   err.Param(),
			Message: getErrorMessage(err),
		})
	}

	return errors
}

// ValidateVar validates a single variable
func (v *Validator) ValidateVar(field interface{}, tag string) error {
	return v.validate.Var(field, tag)
}

func getErrorMessage(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "This field is required"
	case "min":
		return "Value is too short"
	case "max":
		return "Value is too long"
	case "gt":
		return "Value must be greater than " + err.Param()
	case "gte":
		return "Value must be greater than or equal to " + err.Param()
	case "lt":
		return "Value must be less than " + err.Param()
	case "lte":
		return "Value must be less than or equal to " + err.Param()
	case "email":
		return "Invalid email format"
	case "oneof":
		return "Value must be one of: " + err.Param()
	case "coin_symbol":
		return "Invalid coin symbol"
	case "alert_type":
		return "Invalid alert type"
	case "plan":
		return "Invalid plan"
	case "timeframe":
		return "Invalid timeframe"
	default:
		return "Invalid value"
	}
}

// Custom validators

func validateCoinSymbol(fl validator.FieldLevel) bool {
	symbol := fl.Field().String()
	if len(symbol) < 2 || len(symbol) > 20 {
		return false
	}
	// Only allow alphanumeric characters
	for _, c := range symbol {
		if !((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
			return false
		}
	}
	return true
}

func validateAlertType(fl validator.FieldLevel) bool {
	alertType := fl.Field().String()
	validTypes := map[string]bool{
		"PRICE_ABOVE":      true,
		"PRICE_BELOW":      true,
		"PRICE_CHANGE_PCT": true,
		"PERIODIC":         true,
	}
	return validTypes[alertType]
}

func validatePlan(fl validator.FieldLevel) bool {
	plan := fl.Field().String()
	validPlans := map[string]bool{
		"standard": true,
		"pro":      true,
		"ultimate": true,
	}
	return validPlans[plan]
}

func validateTimeframe(fl validator.FieldLevel) bool {
	timeframe := fl.Field().String()
	if timeframe == "" {
		return true // Optional field
	}
	validTimeframes := map[string]bool{
		"5m":  true,
		"15m": true,
		"30m": true,
		"1h":  true,
		"4h":  true,
		"24h": true,
	}
	return validTimeframes[timeframe]
}
