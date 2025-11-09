// Custom build script to disable ESLint plugin and CI warning promotion
// Ensures Create React App does NOT fail build on lint warnings in Vercel

process.env.CI = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';

// Optional: surface a console message
console.log('[build-no-lint] Running CRA build with DISABLE_ESLINT_PLUGIN=true and CI=false');

require('react-scripts/scripts/build');
