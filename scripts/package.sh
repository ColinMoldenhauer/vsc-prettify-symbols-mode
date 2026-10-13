#!/usr/bin/env bash
# Build a .vsix locally, with a version derived from git (e.g. 2.0.0-dev, or 2.0.0-dev-3-gabc1234[-dirty] between tags).
# package.json is left untouched. Usage: npm run package [-- --install]
set -euo pipefail
cd "$(dirname "$0")/.."

version="$(git describe --tags --always --dirty 2>/dev/null || echo 0.0.0-development)"
version="${version#v}"
# bare commit hash (no tag reachable): make it a valid semver
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  version="0.0.0-dev-${version}"
fi

mkdir -p dist
out="dist/prettify-symbols-mode-continued-v${version}.vsix"
npx --no-install vsce package "$version" --no-update-package-json --no-git-tag-version --out "$out"

if [[ "${1:-}" == "--install" ]]; then
  code --install-extension "$out" --force
fi
