#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../backend"

# If something is already listening on 8080, don't start another dev server.
# (ss is commonly available in devcontainer images)
if ss -lnt | awk '{print $4}' | grep -q ':8080$'; then
  echo "Backend already running on :8080, skipping start."
  exit 0
fi

echo "Starting webpack watch..."
npm run watch &

echo "Starting nodemon (serving webpack output)..."
exec npm run dev
