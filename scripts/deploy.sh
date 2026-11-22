#!/usr/bin/env bash
# ==============================================================================
#  Lokify Deployment Script (Bash / POSIX Shell)
# ==============================================================================
set -euo pipefail

VERSION="${1:-1.2.4}"

echo "Deploying Lokify v${VERSION}..."
npm run lint
npm run build
npx cap sync android

git add -A
git commit -m "chore(release): bump version to v${VERSION} and sync multi-stack architecture" || echo "Working tree clean, proceeding to push."
git tag -a "v${VERSION}" -m "Release v${VERSION}" || true
git push origin main
git push origin "v${VERSION}" || true

echo "✓ Deployment pipeline triggered successfully."
