# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Professional VitePress documentation site with Mermaid diagrams
- GitHub Actions CI workflow (TypeScript typecheck + Hardhat tests)
- GitHub Pages deployment workflow
- Enterprise repo governance (issue templates, PR template, CODE_OF_CONDUCT, CONTRIBUTING)
- STATUS.md production readiness checklist
- Windows-safe Hardhat test wrapper for libuv shutdown assertion
- API `/healthz` endpoint with SGEID contract deployment checks
- Docs badges (Docs, CI) in README

### Fixed
- API TypeScript compilation (tsconfig target/lib, ABI imports, fetch typing)
- App TypeScript compilation (Vite env types, wagmi connector config)
- Windows Hardhat false-fail exit code glitch

## [0.1.0] - 2026-01-29

### Added
- Initial monorepo structure (packages: shared, contracts, api, app)
- SGEID ERC721 contract with gasless minting
- Express API with relayer-paid minting, USDC/USDT claim flow
- React PWA with Coinbase Wallet integration
- Hardhat test suite (19 passing tests)
- Coinbase Commerce webhook verification (optional)
- Docker Compose setup for local development
- PM2 ecosystem config for production
- Wallet generation script (`npm run wallet:new`)

[Unreleased]: https://github.com/unykornai/sge/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/unykornai/sge/releases/tag/v0.1.0
