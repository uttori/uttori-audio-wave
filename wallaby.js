module.exports = () => ({
  files: [
    '**/src/!(*.test).js', // all but specs
    '!node_modules/**',
  ],
  tests: [
    '**/test/*.(spec|test).js', // specs only
    '!node_modules/**',
  ],
  env: {
    type: 'node',
  },
  hints: {
    ignoreCoverage: /istanbul ignore (next|line)/,
  },
  testFramework: 'ava',
  debug: true,
});
