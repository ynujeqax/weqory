package notification

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCheckGlobalRateLimit_ConcurrentRequests tests the fix for Bug #2
// Verifies that concurrent requests don't violate rate limits due to race conditions
func TestCheckGlobalRateLimit_ConcurrentRequests(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	// Setup Redis test client
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer redisClient.Close()

	ctx := context.Background()
	// Clean up test keys
	defer redisClient.Del(ctx, globalRateLimitKey)

	service := &Service{
		redis: redisClient,
	}

	// Test concurrent requests
	const concurrentRequests = 50
	allowed := make(chan bool, concurrentRequests)
	var wg sync.WaitGroup

	for i := 0; i < concurrentRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			isAllowed, err := service.checkGlobalRateLimit(ctx)
			require.NoError(t, err)
			allowed <- isAllowed
		}()
	}

	wg.Wait()
	close(allowed)

	// Count how many were allowed
	allowedCount := 0
	for a := range allowed {
		if a {
			allowedCount++
		}
	}

	// Should not exceed the global limit (30 per second)
	assert.LessOrEqual(t, allowedCount, int(globalMaxNotifications),
		"concurrent requests exceeded rate limit")

	// Should have allowed at least some requests
	assert.Greater(t, allowedCount, 0,
		"rate limiter blocked all requests")

	// Verify Redis state is consistent
	count, err := redisClient.ZCard(ctx, globalRateLimitKey).Result()
	require.NoError(t, err)
	assert.Equal(t, int64(allowedCount), count,
		"Redis state inconsistent with allowed count")
}

// TestCheckUserRateLimit_ConcurrentRequests tests user-specific rate limiting
func TestCheckUserRateLimit_ConcurrentRequests(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer redisClient.Close()

	ctx := context.Background()
	userID := int64(12345)
	key := fmt.Sprintf("%s%d", userRateLimitKey, userID)
	defer redisClient.Del(ctx, key)

	service := &Service{
		redis: redisClient,
	}

	// Test concurrent requests for same user
	const concurrentRequests = 20
	allowed := make(chan bool, concurrentRequests)
	var wg sync.WaitGroup

	for i := 0; i < concurrentRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			isAllowed, err := service.checkUserRateLimit(ctx, userID)
			require.NoError(t, err)
			allowed <- isAllowed
		}()
	}

	wg.Wait()
	close(allowed)

	allowedCount := 0
	for a := range allowed {
		if a {
			allowedCount++
		}
	}

	// Should not exceed user limit (10 per minute)
	assert.LessOrEqual(t, allowedCount, int(userMaxNotifications),
		"user rate limit exceeded")
	assert.Greater(t, allowedCount, 0)
}

// TestCheckGlobalRateLimit_NoErrorOnZAddFailure verifies error handling
func TestCheckGlobalRateLimit_NoErrorOnZAddFailure(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	// Use invalid Redis client to simulate failure
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:9999", // Invalid port
	})
	defer redisClient.Close()

	service := &Service{
		redis: redisClient,
	}

	ctx := context.Background()
	_, err := service.checkGlobalRateLimit(ctx)

	// Should return error, not silently fail
	assert.Error(t, err, "should return error on Redis failure")
}

// TestRateLimitExpiry verifies the fix for Bug #7
// Ensures rate limit keys don't expire prematurely
func TestRateLimitExpiry(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer redisClient.Close()

	ctx := context.Background()
	defer redisClient.Del(ctx, globalRateLimitKey)

	service := &Service{
		redis: redisClient,
	}

	// Make a request
	allowed, err := service.checkGlobalRateLimit(ctx)
	require.NoError(t, err)
	assert.True(t, allowed)

	// Check TTL
	ttl, err := redisClient.TTL(ctx, globalRateLimitKey).Result()
	require.NoError(t, err)

	// TTL should be at least the window duration (2x for safety)
	assert.GreaterOrEqual(t, ttl, globalRateLimitWindow,
		"TTL should be at least the rate limit window")
	assert.LessOrEqual(t, ttl, 2*globalRateLimitWindow+time.Second,
		"TTL should not exceed 2x the window")
}

// TestUniqueMemberGeneration tests that concurrent requests generate unique members
func TestUniqueMemberGeneration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer redisClient.Close()

	ctx := context.Background()
	userID := int64(99999)
	key := fmt.Sprintf("%s%d", userRateLimitKey, userID)
	defer redisClient.Del(ctx, key)

	service := &Service{
		redis: redisClient,
	}

	// Make multiple concurrent requests
	const requests = 10
	var wg sync.WaitGroup
	for i := 0; i < requests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = service.checkUserRateLimit(ctx, userID)
		}()
	}
	wg.Wait()

	// Verify all members are unique
	members, err := redisClient.ZRange(ctx, key, 0, -1).Result()
	require.NoError(t, err)

	// Should have unique members (no duplicates)
	uniqueMembers := make(map[string]bool)
	for _, member := range members {
		uniqueMembers[member] = true
	}

	assert.Equal(t, len(members), len(uniqueMembers),
		"all members should be unique")
}

// BenchmarkCheckGlobalRateLimit benchmarks rate limit checking
func BenchmarkCheckGlobalRateLimit(b *testing.B) {
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer redisClient.Close()

	ctx := context.Background()
	defer redisClient.Del(ctx, globalRateLimitKey)

	service := &Service{
		redis: redisClient,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.checkGlobalRateLimit(ctx)
	}
}

// BenchmarkCheckUserRateLimit benchmarks user rate limit checking
func BenchmarkCheckUserRateLimit(b *testing.B) {
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer redisClient.Close()

	ctx := context.Background()
	userID := int64(12345)
	key := fmt.Sprintf("%s%d", userRateLimitKey, userID)
	defer redisClient.Del(ctx, key)

	service := &Service{
		redis: redisClient,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.checkUserRateLimit(ctx, userID)
	}
}
