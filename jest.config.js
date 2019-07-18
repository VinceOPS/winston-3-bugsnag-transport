module.exports = {
  testEnvironment: 'node',
  notify: true,
  testRegex: '((src|libs)/.*\\.(spec|(integration|e2e)-test))\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  roots: ['<rootDir>/src/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!src/**/*.d.ts',
    '!src/**/*.*spec.*ts',
    '!src/**/*.*test.*ts',
  ],
  coverageReporters: ['json', 'lcov'],
  coverageDirectory: 'coverage',
  verbose: true,
  watchPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
};
