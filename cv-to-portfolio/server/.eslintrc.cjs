/* CV2PF server — ESLint (legacy config, ESLint 8) */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: ["eslint:recommended"],
  ignorePatterns: ["node_modules"],
  rules: {},
};
