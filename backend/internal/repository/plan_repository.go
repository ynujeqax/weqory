package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/weqory/backend/pkg/errors"
)

// Plan represents a subscription plan
type Plan struct {
	ID                 string
	Name               string
	Price              int
	MaxCoins           int
	MaxAlerts          int
	MaxNotifications   int
	HistoryRetention   int
	HasAdvancedAlerts  bool
	HasPrioritySupport bool
}

// PlanRepository handles plan database operations
type PlanRepository struct {
	pool *pgxpool.Pool
}

// NewPlanRepository creates a new PlanRepository
func NewPlanRepository(pool *pgxpool.Pool) *PlanRepository {
	return &PlanRepository{pool: pool}
}

// GetByID retrieves a plan by ID
func (r *PlanRepository) GetByID(ctx context.Context, id string) (*Plan, error) {
	query := `
		SELECT id, name, price, max_coins, max_alerts, max_notifications,
		       history_retention, has_advanced_alerts, has_priority_support
		FROM plans WHERE id = $1
	`
	var plan Plan
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&plan.ID, &plan.Name, &plan.Price, &plan.MaxCoins, &plan.MaxAlerts,
		&plan.MaxNotifications, &plan.HistoryRetention, &plan.HasAdvancedAlerts,
		&plan.HasPrioritySupport,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.ErrPlanNotFound
		}
		return nil, err
	}
	return &plan, nil
}

// GetAll retrieves all plans
func (r *PlanRepository) GetAll(ctx context.Context) ([]Plan, error) {
	query := `
		SELECT id, name, price, max_coins, max_alerts, max_notifications,
		       history_retention, has_advanced_alerts, has_priority_support
		FROM plans ORDER BY price ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []Plan
	for rows.Next() {
		var plan Plan
		err := rows.Scan(
			&plan.ID, &plan.Name, &plan.Price, &plan.MaxCoins, &plan.MaxAlerts,
			&plan.MaxNotifications, &plan.HistoryRetention, &plan.HasAdvancedAlerts,
			&plan.HasPrioritySupport,
		)
		if err != nil {
			return nil, err
		}
		plans = append(plans, plan)
	}
	return plans, nil
}

// GetDefaultPlan retrieves the default free plan
func (r *PlanRepository) GetDefaultPlan(ctx context.Context) (*Plan, error) {
	return r.GetByID(ctx, "standard")
}
