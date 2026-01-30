{
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"npm:dev -w @sge/api\" \"npm:dev -w @sge/app\"",
    "build": "npm run build -w @sge/shared && npm run build -w @sge/contracts && npm run build -w @sge/api && npm run build -w @sge/app",
    "build:shared": "npm run build -w @sge/shared",
    "build:contracts": "npm run build -w @sge/contracts",
    "build:api": "npm run build -w @sge/api",
    "build:app": "npm run build -w @sge/app",
    "typecheck": "tsc -b",
    "lint": "echo 'Lint not configured yet'",
    "clean": "npm run clean -ws --if-present",
    "wallet:new": "node scripts/wallet-new.mjs",
    "test": "echo 'Tests not configured yet'"
  }
}