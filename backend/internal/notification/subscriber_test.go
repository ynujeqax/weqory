package notification

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestTryMarkProcessed_ConcurrentRequests tests the fix for Bug #4
// Verifies atomic check-and-mark prevents duplicate processing
func TestTryMarkProcessed_ConcurrentRequests(t *testing.T) {
	subscriber := &Subscriber{
		processedIDs: make(map[string]time.Time),
	}

	eventID := "test-event-123"
	const goroutines = 100

	// Track how many goroutines successfully marked the event
	successCount := 0
	var mu sync.Mutex
	var wg sync.WaitGroup

	// All goroutines try to mark the same event
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if subscriber.tryMarkProcessed(eventID) {
				mu.Lock()
				successCount++
				mu.Unlock()
			}
		}()
	}

	wg.Wait()

	// Only ONE goroutine should have succeeded
	assert.Equal(t, 1, successCount,
		"exactly one goroutine should mark event as processed")

	// Event should be in the map
	subscriber.processedMu.RLock()
	_, exists := subscriber.processedIDs[eventID]
	subscriber.processedMu.RUnlock()
	assert.True(t, exists, "event should be marked as processed")
}

// TestTryMarkProcessed_UnboundedGrowthPrevention tests the fix for Bug #3
// Verifies the map doesn't grow beyond maxProcessedIDsSize
func TestTryMarkProcessed_UnboundedGrowthPrevention(t *testing.T) {
	subscriber := &Subscriber{
		processedIDs: make(map[string]time.Time),
	}

	// Fill the map beyond the limit with old entries
	cutoff := time.Now().Add(-2 * time.Hour)
	for i := 0; i < maxProcessedIDsSize+100; i++ {
		eventID := "old-event-" + string(rune(i))
		subscriber.processedIDs[eventID] = cutoff
	}

	initialSize := len(subscriber.processedIDs)
	require.Greater(t, initialSize, maxProcessedIDsSize,
		"initial size should exceed max")

	// Try to add a new event
	newEventID := "new-event"
	success := subscriber.tryMarkProcessed(newEventID)

	// Should succeed after cleanup
	assert.True(t, success, "should succeed after cleanup")

	// Size should be reduced
	finalSize := len(subscriber.processedIDs)
	assert.LessOrEqual(t, finalSize, maxProcessedIDsSize,
		"size should not exceed max after cleanup")
}

// TestTryMarkProcessed_EmergencyCleanup tests emergency cleanup under max capacity
func TestTryMarkProcessed_EmergencyCleanup(t *testing.T) {
	subscriber := &Subscriber{
		processedIDs: make(map[string]time.Time),
	}

	// Fill with recent entries (within 10 minutes)
	recent := time.Now().Add(-5 * time.Minute)
	for i := 0; i < maxProcessedIDsSize; i++ {
		eventID := "recent-event-" + string(rune(i))
		subscriber.processedIDs[eventID] = recent
	}

	initialSize := len(subscriber.processedIDs)
	assert.Equal(t, maxProcessedIDsSize, initialSize)

	// Try to add new event
	newEventID := "new-event"
	success := subscriber.tryMarkProcessed(newEventID)

	// Should still succeed (allows slight overflow for safety)
	assert.True(t, success)

	// Event should be in map
	subscriber.processedMu.RLock()
	_, exists := subscriber.processedIDs[newEventID]
	subscriber.processedMu.RUnlock()
	assert.True(t, exists)
}

// TestRemoveProcessed tests the cleanup mechanism
func TestRemoveProcessed(t *testing.T) {
	subscriber := &Subscriber{
		processedIDs: make(map[string]time.Time),
	}

	eventID := "test-event"
	subscriber.processedIDs[eventID] = time.Now()

	subscriber.removeProcessed(eventID)

	subscriber.processedMu.RLock()
	_, exists := subscriber.processedIDs[eventID]
	subscriber.processedMu.RUnlock()

	assert.False(t, exists, "event should be removed")
}

// TestCleanupProcessedIDs tests the periodic cleanup
func TestCleanupProcessedIDs(t *testing.T) {
	subscriber := &Subscriber{
		processedIDs: make(map[string]time.Time),
	}

	// Add old and new events
	oldTime := time.Now().Add(-2 * time.Hour)
	newTime := time.Now().Add(-30 * time.Minute)

	subscriber.processedIDs["old-1"] = oldTime
	subscriber.processedIDs["old-2"] = oldTime
	subscriber.processedIDs["new-1"] = newTime
	subscriber.processedIDs["new-2"] = newTime

	assert.Equal(t, 4, len(subscriber.processedIDs))

	// Run cleanup
	subscriber.cleanupProcessedIDs()

	// Old entries should be removed
	subscriber.processedMu.RLock()
	size := len(subscriber.processedIDs)
	_, hasOld1 := subscriber.processedIDs["old-1"]
	_, hasNew1 := subscriber.processedIDs["new-1"]
	subscriber.processedMu.RUnlock()

	assert.Equal(t, 2, size, "should only have 2 entries")
	assert.False(t, hasOld1, "old entries should be removed")
	assert.True(t, hasNew1, "new entries should remain")
}

// TestTryMarkProcessed_ThreadSafety stress tests thread safety
func TestTryMarkProcessed_ThreadSafety(t *testing.T) {
	subscriber := &Subscriber{
		processedIDs: make(map[string]time.Time),
	}

	const goroutines = 1000
	const eventsPerGoroutine = 10

	var wg sync.WaitGroup
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < eventsPerGoroutine; j++ {
				eventID := "event-" + string(rune(id*eventsPerGoroutine+j))
				subscriber.tryMarkProcessed(eventID)
			}
		}(i)
	}

	wg.Wait()

	// Should not panic and should have processed many events
	subscriber.processedMu.RLock()
	size := len(subscriber.processedIDs)
	subscriber.processedMu.RUnlock()

	assert.Greater(t, size, 0, "should have processed events")
	assert.LessOrEqual(t, size, maxProcessedIDsSize,
		"should not exceed max size")
}

// BenchmarkTryMarkProcessed benchmarks the atomic mark operation
func BenchmarkTryMarkProcessed(b *testing.B) {
	subscriber := &Subscriber{
		processedIDs: make(map[string]time.Time),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		eventID := "event-" + string(rune(i))
		subscriber.tryMarkProcessed(eventID)
	}
}

// BenchmarkTryMarkProcessed_Concurrent benchmarks concurrent access
func BenchmarkTryMarkProcessed_Concurrent(b *testing.B) {
	subscriber := &Subscriber{
		processedIDs: make(map[string]time.Time),
	}

	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			eventID := "event-" + string(rune(i))
			subscriber.tryMarkProcessed(eventID)
			i++
		}
	})
}
