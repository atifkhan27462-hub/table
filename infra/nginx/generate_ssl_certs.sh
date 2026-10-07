#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Generate 4096-bit RSA Self-Signed SSL Certificate with Subject Alternative Names
# For Local Staging, Offline Restaurant LANs, and Smart Table Hardware Proving
# -----------------------------------------------------------------------------

set -euo pipefail

SSL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ssl"
mkdir -p "$SSL_DIR"

echo "Generating modern 4096-bit RSA SSL certificate and private key..."

openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout "$SSL_DIR/smart_table.key" \
  -out "$SSL_DIR/smart_table.crt" \
  -subj "/C=US/ST=California/L=San Francisco/O=Smart Interactive Dining Table/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:smarttable.local,IP:127.0.0.1,IP:192.168.1.100"

chmod 600 "$SSL_DIR/smart_table.key"
chmod 644 "$SSL_DIR/smart_table.crt"

echo "SSL Certificate generated successfully at:"
echo " - Key:  $SSL_DIR/smart_table.key"
echo " - Cert: $SSL_DIR/smart_table.crt"
