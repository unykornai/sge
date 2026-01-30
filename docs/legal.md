# Legal & Licensing

This page summarizes the legal framework governing the SGE Energy codebase.

## Dual Licensing

This project is **dual-licensed** under your choice of:

- **[MIT License](https://github.com/unykornai/sge/blob/main/LICENSE-MIT)** - Simple, permissive, maximum compatibility
- **[Apache License 2.0](https://github.com/unykornai/sge/blob/main/LICENSE-APACHE)** - Permissive + explicit patent grant

See [LICENSES.md](https://github.com/unykornai/sge/blob/main/LICENSES.md) for complete details.

### Why Dual License?

We want both **maximum adoption** and **strong protection**:

| License | Benefits |
|---------|----------|
| **MIT** | Simple, widely understood, maximum compatibility |
| **Apache 2.0** | Explicit patent grant, patent retaliation clause, clearer contributor terms |

**You choose** which license works best for your use case.

## Patent Grant (Apache 2.0)

The Apache 2.0 license includes critical IP protections:

### Explicit Patent License
Every contributor grants you a **perpetual, worldwide, non-exclusive patent license** to use their contributions.

### Patent Retaliation
If you sue for patent infringement related to this project, **you lose your license rights**. This protects against patent trolling.

### What This Means
- ✅ You can use this code without patent lawsuits from contributors
- ✅ Commercial use is fully permitted
- ✅ Patent trolls are deterred by retaliation clause

## Trademarks

**Code license ≠ Trademark license**

The MIT/Apache licenses grant rights to the **code**. They do **NOT** grant rights to:

- "SGE" name
- "SGE Energy" branding
- SGE logos and visual marks

See **[TRADEMARKS.md](https://github.com/unykornai/sge/blob/main/TRADEMARKS.md)** for full trademark policy.

### Summary

✅ **Allowed Without Permission:**
- "Built with SGE Energy technology"
- "Compatible with SGE contracts"
- "Fork of SGE codebase"

❌ **Requires Permission:**
- Using "SGE" in your product name
- Using SGE logos
- Implying official endorsement

**Forks should use their own brand** while crediting SGE as the underlying technology.

## Contributor Terms (DCO)

All contributions require a **Developer Certificate of Origin (DCO) sign-off**.

### What is DCO?

A lightweight way to certify that:
- You wrote the code, OR
- You have the right to submit it under the project licenses

### How to Sign Off

Add `-s` to your git commit:

```bash
git commit -s -m "feat: add new feature"
```

This adds:
```
Signed-off-by: Your Name <your.email@example.com>
```

See **[DCO.md](https://github.com/unykornai/sge/blob/main/DCO.md)** for complete details.

### Why DCO?

- **Protects you** - Certifies you have rights to contribute
- **Protects the project** - Clear IP chain for all code
- **Lightweight** - No CLA bureaucracy
- **Standard** - Used by Linux kernel, GitLab, and major OSS projects

### Enforcement

Pull requests **without DCO sign-off** cannot be merged. Our CI checks for this automatically.

## Copyright & Attribution

### Copyright Notice

```
Copyright (c) 2024-2026 SGE Energy Contributors
```

All contributors retain copyright to their contributions but license them under MIT/Apache 2.0.

### Attribution Requirements

If you distribute this software:

#### Under MIT:
- Include the MIT license text
- Include copyright notice

#### Under Apache 2.0:
- Include the Apache license text
- Include the NOTICE file
- Preserve all copyright notices
- Document any modifications

## Third-Party Licenses

This project depends on open-source software with its own licenses:

| Dependency | License | Purpose |
|------------|---------|---------|
| ethers.js | MIT | Ethereum interaction |
| Hardhat | MIT | Smart contract development |
| Express | MIT | HTTP server |
| React | MIT | UI framework |
| Vite | MIT | Build tool |
| VitePress | MIT | Documentation |

All dependencies are permissive and compatible with our dual-licensing.

To view all dependency licenses:
```bash
npm list --all
# Check individual licenses in node_modules/*/LICENSE
```

## Warranty Disclaimer

**Both licenses include "AS IS" warranty disclaimers:**

- ⚠️ **No warranty** of any kind (express or implied)
- ⚠️ **No guarantee** of fitness for particular purpose
- ⚠️ **You assume all risk** from using this software

This is **standard** for open-source projects.

## Liability Limitation

**Both licenses limit contributor liability:**

- 🛡️ Contributors are **not liable** for damages
- 🛡️ Includes direct, indirect, incidental, consequential damages
- 🛡️ Even if advised of possibility of such damages

### What This Means

If you use this code and something goes wrong:
- You can't sue contributors for damages
- You accept responsibility for your usage
- You should conduct your own security audits

## Commercial Use

**Yes, commercial use is permitted** under both licenses:

✅ **You CAN:**
- Use in commercial products
- Offer as SaaS
- Charge customers
- Modify and resell
- Use in closed-source products

❌ **You MUST:**
- Include license text (MIT or Apache)
- Include copyright notice
- NOT use SGE trademarks (without permission)
- NOT claim SGE endorses your product

## Contributions

By contributing to this project, you agree that:

1. **Your contributions will be licensed** under MIT AND Apache 2.0 (dual-licensed)
2. **You certify the DCO** - you have rights to contribute
3. **You grant a patent license** (via Apache 2.0)
4. **Your name/email will be public** in Git history

See [CONTRIBUTING.md](https://github.com/unykornai/sge/blob/main/.github/CONTRIBUTING.md) for full contribution guidelines.

## License Compatibility

Our dual-licensing is compatible with:

✅ **Can be used in:**
- MIT projects
- Apache 2.0 projects
- BSD projects
- Other permissive licenses
- Closed-source projects

❌ **May have issues with:**
- GPL (copyleft) - check with legal counsel
- AGPL (network copyleft) - check with legal counsel

**General rule:** Permissive licenses are compatible with most other licenses.

## Changing Licenses

**Can we change the license in the future?**

- **Existing code** - Remains under MIT/Apache 2.0 (can't retroactively change)
- **New versions** - Could potentially change, but unlikely
- **Your usage** - You keep rights under the license version you received

## Jurisdiction & Disputes

### Governing Law

Check the license files for jurisdiction clauses (if any). Generally:
- Apache 2.0 has no specific jurisdiction
- MIT has no specific jurisdiction

### Dispute Resolution

For licensing disputes:
1. Contact maintainers via GitHub Issues
2. Seek legal counsel for formal disputes
3. Arbitration may be required (depends on your jurisdiction)

## Contact

For legal questions:

- **General inquiries**: Open a [GitHub Discussion](https://github.com/unykornai/sge/discussions)
- **Trademark permissions**: [your-trademark-email]
- **Serious legal issues**: [your-legal-email]

---

## Quick Reference

### ✅ What You Can Do (No Permission Required)

| Action | License | Notes |
|--------|---------|-------|
| **Use the code** | MIT or Apache | Including commercial use |
| **Modify the code** | MIT or Apache | Make any changes |
| **Distribute** | MIT or Apache | Include license text |
| **Fork on GitHub** | MIT or Apache | Public or private |
| **Use in closed-source** | MIT or Apache | Include license |
| **Mention SGE in docs** | No license needed | Factual reference |

### ❌ What Requires Permission

| Action | Policy | Contact |
|--------|--------|---------|
| **Use "SGE" in product name** | Trademark | [trademark-email] |
| **Use SGE logo** | Trademark | [trademark-email] |
| **Imply SGE endorsement** | Trademark | [trademark-email] |
| **Patent assertion** | Revokes license | N/A (don't do this) |

---

## Resources

- **[LICENSE-MIT](https://github.com/unykornai/sge/blob/main/LICENSE-MIT)** - Full MIT license text
- **[LICENSE-APACHE](https://github.com/unykornai/sge/blob/main/LICENSE-APACHE)** - Full Apache 2.0 text
- **[LICENSES.md](https://github.com/unykornai/sge/blob/main/LICENSES.md)** - Dual-license explanation
- **[TRADEMARKS.md](https://github.com/unykornai/sge/blob/main/TRADEMARKS.md)** - Trademark policy
- **[DCO.md](https://github.com/unykornai/sge/blob/main/DCO.md)** - Contributor certificate
- **[NOTICE](https://github.com/unykornai/sge/blob/main/NOTICE)** - Attribution notices

---

**Disclaimer:** This page is a summary for convenience. The actual license files (LICENSE-MIT and LICENSE-APACHE) are the legally binding documents. When in doubt, consult with legal counsel.
