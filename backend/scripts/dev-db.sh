#!/usr/bin/env bash
set -e

cloud-sql-proxy "noted-reef-387021:us-central1:cms-mickeyf" --port 3306 &
PROXY_PID=$!

trap "kill $PROXY_PID" EXIT

npm run watch &
npm run dev
