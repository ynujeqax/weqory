# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go.mod files
COPY go.work ./
COPY pkg/go.mod pkg/go.sum ./pkg/
COPY cmd/notification/go.mod cmd/notification/go.sum ./cmd/notification/

# Download dependencies
WORKDIR /app/pkg
RUN go mod download

WORKDIR /app/cmd/notification
RUN go mod download

# Copy source code
WORKDIR /app
COPY pkg ./pkg
COPY cmd/notification ./cmd/notification
COPY internal ./internal

# Build
WORKDIR /app/cmd/notification
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /notification ./main.go

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install CA certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Copy binary
COPY --from=builder /notification .

# Create non-root user
RUN adduser -D -g '' appuser
USER appuser

EXPOSE 8082

CMD ["./notification"]
