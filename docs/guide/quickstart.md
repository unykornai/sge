# Quickstart

This repo is an npm-workspaces monorepo with:
- `@sge/contracts` (Hardhat)
- `@sge/api` (Express)
- `@sge/app` (Vite + React PWA)

## 1) Install

```bash
npm install
```

## 2) Configure env

- API: `packages/api/.env`
- App: `packages/app/.env.local`

## 3) Build shared

```bash
npm run build -w @sge/shared
```

## 4) Run dev

```bash
npm run dev
```

## Demo notes

GitHub Pages can host static sites. Your API requires secrets + RPC access, so the public demo should be the docs site. For a full end-to-end demo, run locally or deploy API + app separately.
