/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Import .md files as raw strings, so docs/ stays the single source of truth
    // for content we also render in-app (see src/app/rules/least-count/page.tsx).
    // Deliberately not fs.readFileSync at request time: docs/ sits outside the
    // traced serverless bundle, so that approach works locally and 404s in
    // production. A string bundled at build time can't drift or go missing.
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    return config;
  },
};

module.exports = nextConfig;
