# Release Checklist

Use this checklist before creating a new release.

## Pre-Release

- [ ] All CI checks passing on `main`
- [ ] All tests passing locally (`npm run test:ci`)
- [ ] Docs build succeeds (`npm run docs:build`)
- [ ] No uncommitted changes (`git status`)
- [ ] Dependencies up to date (`npm outdated`)
- [ ] Security audit clean (`npm audit`)

## Version Bump

- [ ] Update version in `package.json` (root + all workspace packages)
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Move `[Unreleased]` section to new version heading
- [ ] Update comparison links at bottom of CHANGELOG
- [ ] Commit: `chore: bump version to X.Y.Z`

## Testing

- [ ] Deploy to staging environment
- [ ] Test register flow (gasless mint)
- [ ] Test claim flow (approve + claim)
- [ ] Test webhook flow (if Commerce enabled)
- [ ] Test admin endpoints
- [ ] Test `/healthz` returns healthy
- [ ] Verify contract addresses in production `.env`
- [ ] Verify relayer wallet has sufficient ETH

## Documentation

- [ ] README reflects new features/changes
- [ ] Docs site updated with new content
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Migration guide added (if breaking changes)

## Deployment

- [ ] Tag release: `git tag -a vX.Y.Z -m "Release X.Y.Z"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Create GitHub Release with changelog
- [ ] Deploy API to production
- [ ] Deploy app to production
- [ ] Verify production health checks
- [ ] Monitor logs for 30 minutes

## Post-Release

- [ ] Announce release in Discord/Telegram/Twitter
- [ ] Update STATUS.md if production ready
- [ ] Create next milestone in GitHub
- [ ] Update project roadmap

## Rollback Plan

If issues are discovered:

1. Revert to previous release tag
2. Redeploy previous version
3. Document issue in GitHub Issues
4. Create hotfix branch if needed
5. Follow this checklist for hotfix release

## Emergency Contacts

- **Deployer Wallet**: Check STATUS.md
- **Relayer Wallet**: Monitor balance, rotate keys if compromised
- **Admin API Key**: Rotate immediately if leaked
- **Commerce Webhook Secret**: Contact Coinbase Commerce support

## Notes

- Always test on testnet/staging first
- Keep relayer wallet funded (minimum 0.05 ETH)
- Backup `.env` files before changing
- Never commit private keys
