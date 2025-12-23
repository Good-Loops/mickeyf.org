# Stops dev infrastructure (Cloud SQL Proxy) used by the backend devcontainer.

#!/usr/bin/env bash
set -euo pipefail

docker compose -f .devcontainer/docker-compose.yml down
