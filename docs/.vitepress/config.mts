import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'en-US',
  title: 'SGE Claim System',
  description: 'Gasless SGE-ID minting + USDC/USDT approve+claim on Ethereum mainnet.',

  // The docs include many links to repository files and localhost dev URLs.
  // Enforcing dead-link checks breaks CI and GitHub Pages builds.
  ignoreDeadLinks: true,

  // GitHub Pages publishes under /<repo>/ by default.
  // Overridable in CI with VITEPRESS_BASE.
  base: process.env.VITEPRESS_BASE ?? '/sge/',

  lastUpdated: true,
  cleanUrls: true,

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'SGE Claim System',

    nav: [
      { text: 'Guide', link: '/guide/quickstart' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Diagrams', link: '/diagrams/architecture' },
      { text: 'Demo', link: '/demo/' },
      { text: 'Operations', link: '/ops/runbook' },
      { text: 'Status', link: '/status' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quickstart', link: '/guide/quickstart' },
            { text: 'Environment Setup', link: '/guide/environment' },
            { text: 'Upgrade Path', link: '/guide/upgrade-path' },
            { text: 'Testing', link: '/guide/testing' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'System Architecture',
          items: [
            { text: 'Index', link: '/architecture/index' },
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'System Design', link: '/architecture/system' },
            { text: 'Workflows', link: '/architecture/workflows' },
            { text: 'Flow Trees', link: '/architecture/flows' },
            { text: 'Data & Storage', link: '/architecture/data' },
            { text: 'Enterprise Platform', link: '/architecture/enterprise' },
          ],
        },
        {
          text: 'Brand Guidelines',
          items: [
            { text: 'Theme & Style', link: '/brand/theme' },
          ],
        },
      ],
      '/diagrams/': [
        {
          text: 'Diagrams',
          items: [
            { text: 'Architecture', link: '/diagrams/architecture' },
            { text: 'Flows', link: '/diagrams/flows' },
            { text: 'Sequences', link: '/diagrams/sequence' },
            { text: 'Trust Boundaries', link: '/diagrams/trust-boundaries' },
            { text: 'Data Model', link: '/diagrams/data-model' },
          ],
        },
      ],
      '/demo/': [
        {
          text: 'Interactive Demo',
          items: [
            { text: 'Claim Flow', link: '/demo/' },
            { text: 'Dashboard', link: '/demo/dashboard' },
          ],
        },
      ],
      '/ops/': [
        {
          text: 'Operations',
          items: [
            { text: 'Runbook', link: '/ops/runbook' },
            { text: 'Reconciliation', link: '/ops/reconciliation' },
            { text: 'Performance Claims', link: '/ops/claims' },
            { text: 'Threat Model', link: '/ops/threat-model' },
          ],
        },
        {
          text: 'Compliance',
          items: [
            { text: 'Disclosures', link: '/disclosures' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/unykornai/sge' }],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Built for Ethereum mainnet. Use at your own risk.',
      copyright: 'Copyright © 2026',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },

  vite: {},
});
