#!/usr/bin/env bash
# Executar UMA VEZ em um Codespace com Node.js 24, na branch do Pull Request.
# Atualiza package.json e package-lock.json com versões resolvidas pelo npm.
set -euo pipefail
if [ "$(node -p 'process.versions.node.split(".")[0]')" != "24" ]; then
  echo 'Este projeto exige Node.js 24. Se estiver no Codespace, execute: nvm install 24 && nvm use 24' >&2
  exit 1
fi
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm run test:unit
npm run test:components
npm run test:integration
