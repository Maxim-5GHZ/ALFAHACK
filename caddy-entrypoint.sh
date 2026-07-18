#!/bin/sh

set -e

CADDY_HOST="${CADDY_HOST:-localhost}"

is_ip_or_localhost() {
    case "$CADDY_HOST" in
        localhost|127.0.0.1)
            return 0
            ;;
        *.*)
            # Contains a dot — might be a real domain or an IP
            # Check if it's an IPv4 address
            if echo "$CADDY_HOST" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
                return 0
            fi
            return 1
            ;;
        *)
            # No dots — not a domain
            return 0
            ;;
    esac
}

if is_ip_or_localhost; then
    echo "[entrypoint] CADDY_HOST='${CADDY_HOST}' — no real domain detected, using plain HTTP on :80"

    cat > /etc/caddy/Caddyfile <<'CADDYEOF'
{
    admin off
    auto_https off
}

:80 {
    log {
        output file /data/caddy/logs/access.log
    }

    @backend {
        path /api/*
        path /health
    }
    reverse_proxy @backend backend:8000

    reverse_proxy frontend:3000
}
CADDYEOF

else
    echo "[entrypoint] CADDY_HOST='${CADDY_HOST}' — real domain detected, using HTTPS with TLS"

    cat > /etc/caddy/Caddyfile <<'CADDYEOF'
{
    admin off
}

{$CADDY_HOST} {
    tls {$CADDY_TLS_EMAIL:internal}

    log {
        output file /data/caddy/logs/access.log
    }

    @backend {
        path /api/*
        path /health
    }
    reverse_proxy @backend backend:8000

    reverse_proxy frontend:3000
}
CADDYEOF

fi

exec /usr/bin/caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
