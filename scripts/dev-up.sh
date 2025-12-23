#!/usr/bin/env bash
set -euo pipefail

echo "Starting Cloud SQL Proxy..."
docker compose -f .devcontainer/docker-compose.yml up -d cloud-sql-proxy
echo "Dev infrastructure ready."

