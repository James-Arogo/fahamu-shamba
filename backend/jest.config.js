export default {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    '*.js',
    '!node_modules/**',
    '!jest.config.js',
    '!tests/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/'
  ],
  verbose: true,
  bail: false,
  testTimeout: 10000,
  forceExit: true
};
