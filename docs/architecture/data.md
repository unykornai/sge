# Data & Storage

## Storage model

The API stores small operational records (e.g., mint records, claims) in a JSON persistence layer.

```mermaid
erDiagram
  WALLET ||--o| MINT_RECORD : has
  WALLET {
    string address
  }
  MINT_RECORD {
    int tokenId
    string txHash
    int timestamp
  }
```

## Notes

- For production scale, migrate JSON persistence to Postgres.
- Keep PII minimal; prefer wallet address identifiers.
