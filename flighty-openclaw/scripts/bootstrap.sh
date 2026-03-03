#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
echo "Installing dependencies..."
npm install

echo "Done. Run: npm run dev"
