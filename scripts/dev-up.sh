#!/usr/bin/env bash
set -e

echo "Starting Cloud SQL Proxy..."
docker compose up -d cloud-sql-proxy

echo "Dev infrastructure ready."
