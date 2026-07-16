module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/**/*.spec.ts",
    "<rootDir>/test/**/*.e2e-spec.ts",
    "<rootDir>/test/**/*.integration-spec.ts"
  ],
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true
          },
          target: "es2022"
        },
        module: {
          type: "commonjs"
        }
      }
    ]
  }
};
