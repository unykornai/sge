# Developer Certificate of Origin (DCO)

## Overview

This project requires all contributors to sign off on their commits using the **Developer Certificate of Origin (DCO)**.

This is a lightweight way to certify that you wrote the code or have the right to submit it under the project's open source licenses.

## The Certificate

By signing off on your commits, you certify the following (DCO 1.1):

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

## How to Sign Off

### Method 1: Using Git (Recommended)

Add `-s` or `--signoff` to your `git commit` command:

```bash
git commit -s -m "feat: add new feature"
```

This automatically adds a `Signed-off-by` line to your commit message:

```
feat: add new feature

Signed-off-by: Your Name <your.email@example.com>
```

### Method 2: Manually

Add this line to your commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

Use your **real name** (no pseudonyms or anonymous contributions).

### Configure Git Globally

To always sign off commits automatically:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Optional: create an alias for signed commits
git config --global alias.ci "commit -s"
```

Now you can use `git ci -m "message"` instead of `git commit -s -m "message"`.

## Why DCO?

The DCO:
- **Protects contributors** - You certify you have rights to contribute
- **Protects the project** - Clear chain of custody for all code
- **Lightweight** - No CLA (Contributor License Agreement) bureaucracy
- **Standard practice** - Used by Linux kernel, GitLab, and many major projects

## Checking Sign-Off

### Before Pushing

Check your last commit:

```bash
git log -1 --pretty=format:"%B"
```

You should see `Signed-off-by` at the end.

### Amending Unsigned Commits

If you forgot to sign off:

```bash
git commit --amend --signoff
```

For older commits (rebase required):

```bash
git rebase --signoff HEAD~3  # last 3 commits
```

## Pull Request Requirements

All commits in pull requests **MUST** include the `Signed-off-by` line.

### CI Check

Our CI pipeline checks for DCO compliance. PRs without sign-off will fail CI and cannot be merged.

### Sign-Off Multiple Authors

If multiple people worked on a commit:

```
feat: collaborative feature

Co-authored-by: Alice <alice@example.com>
Co-authored-by: Bob <bob@example.com>
Signed-off-by: Alice <alice@example.com>
Signed-off-by: Bob <bob@example.com>
```

Each author should sign off separately.

## What Happens to My Sign-Off?

- **Public record** - Sign-offs are part of the permanent Git history
- **Name and email** - Will be visible in the repository
- **Cannot be removed** - Once merged, sign-offs are permanent
- **License agreement** - Sign-off means you agree to license terms

## Corporate Contributors

If you contribute on behalf of your employer:

1. Ensure you have permission to contribute
2. Sign off with your corporate email
3. Check if your employer requires a separate CLA

Example:

```
Signed-off-by: John Smith <john.smith@company.com>
```

## Questions & Exceptions

### Can I use a pseudonym?

No. We require real names for legal clarity.

### What if I made a typo in my sign-off?

You can amend the commit before pushing. After merging, we generally don't change history.

### What about automated commits (bots)?

Automated commits should include:

```
Signed-off-by: Bot Name <bot@automated.example>
On-behalf-of: Real Person <person@example.com>
```

### I don't want my email public

You can use GitHub's no-reply email:

```bash
git config user.email "username@users.noreply.github.com"
```

## Enforcement

- PRs **without sign-off** will not be merged
- Existing code remains grandfathered (no retroactive requirement)
- Maintainers may request sign-off amendments before merge

## Resources

- [DCO Official Site](https://developercertificate.org/)
- [GitHub DCO App](https://github.com/apps/dco)
- [Git Sign-Off Documentation](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt--s)

---

## Quick Reference

### ✅ Good Commit

```
feat: add health check endpoint

Add /healthz endpoint for monitoring.

Signed-off-by: Jane Doe <jane@example.com>
```

### ❌ Bad Commit

```
feat: add health check endpoint

Add /healthz endpoint for monitoring.

(No sign-off - CI will fail)
```

### 🔧 Fix Unsigned Commit

```bash
git commit --amend --signoff
git push --force-with-lease
```

---

**By contributing to this project, you agree to the DCO terms above.**
