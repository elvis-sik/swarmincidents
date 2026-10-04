#!/usr/bin/env bash
# Runs inside the Playwright Docker image (same image as CI): installs from the lockfile into a container-only
# node_modules volume, then runs the given command. Used by `npm run test:visual` and `npm run test:update-visual`.
set -euo pipefail
npm install -g sfw --loglevel=error
sfw npm ci --no-audit --no-fund --loglevel=error
exec "$@"
