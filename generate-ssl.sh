#!/bin/bash
set -e

SSL_DIR="$(dirname "$0")/nginx/ssl"

mkdir -p "$SSL_DIR"

if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
    echo "SSL certificates already exist in $SSL_DIR"
    exit 0
fi

echo "Generating self-signed SSL certificates..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

echo "SSL certificates generated successfully!"
echo "Note: For production, use Let's Encrypt or purchase a proper certificate."
