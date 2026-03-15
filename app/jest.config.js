const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

module.exports = createJestConfig({
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  coverageProvider: "v8",
  collectCoverageFrom: [
    "app/api/**/*.ts",
    "auth.config.ts",
    "!app/api/auth/**",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  testMatch: ["**/__tests__/**/*.test.ts"],
});
