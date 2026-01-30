import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'en-US',
  title: 'SGE Claim System',
  description: 'Gasless SGE-ID minting + USDC/USDT approve+claim on Ethereum mainnet.',

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
      { text: 'Runbook', link: '/ops/runbook' },
      { text: 'Status', link: '/status' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Quickstart', link: '/guide/quickstart' },
            { text: 'Environment', link: '/guide/environment' },
            { text: 'Testing', link: '/guide/testing' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Flow Trees', link: '/architecture/flows' },
            { text: 'Data & Storage', link: '/architecture/data' },
          ],
        },
      ],
      '/ops/': [
        {
          text: 'Operations',
          items: [
            { text: 'Runbook', link: '/ops/runbook' },
            { text: 'Claims (Evidence)', link: '/ops/claims' },
            { text: 'Threat Model', link: '/ops/threat-model' },
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
