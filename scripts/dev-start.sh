#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."   # project root

./scripts/dev-up.sh

# Open VS Code in THIS WSL folder (requires the 'code' CLI to work in WSL)
code .

