# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go.mod files
COPY go.work ./
COPY pkg/go.mod pkg/go.sum ./pkg/
COPY cmd/api-gateway/go.mod cmd/api-gateway/go.sum ./cmd/api-gateway/

# Download dependencies
WORKDIR /app/pkg
RUN go mod download

WORKDIR /app/cmd/api-gateway
RUN go mod download

# Copy source code
WORKDIR /app
COPY pkg ./pkg
COPY cmd/api-gateway ./cmd/api-gateway
COPY internal ./internal

# Build
WORKDIR /app/cmd/api-gateway
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /api-gateway ./main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install CA certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Copy binary
COPY --from=builder /api-gateway .

# Create non-root user
RUN adduser -D -g '' appuser
USER appuser

EXPOSE 8080

CMD ["./api-gateway"]
