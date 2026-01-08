FROM golang:1.24-alpine AS builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o ark-apiserver ./cmd/apiserver

FROM alpine:3.19

RUN apk add --no-cache ca-certificates sqlite-libs

WORKDIR /app

COPY --from=builder /app/ark-apiserver /app/ark-apiserver

RUN adduser -D -u 1000 ark && \
    mkdir -p /data && \
    chown -R ark:ark /data

USER ark

EXPOSE 8443

ENTRYPOINT ["/app/ark-apiserver"]
