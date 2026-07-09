/* CV2PF client — ESLint (legacy config, ESLint 8) */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "detect" } },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    // 소규모 앱 컨벤션: 런타임 PropTypes 대신 코드 리뷰로 props 계약을 관리한다.
    "react/prop-types": "off",
  },
  overrides: [
    {
      // Node 컨텍스트에서 실행되는 설정 파일
      files: ["vite.config.js", "*.cjs"],
      env: { node: true },
    },
  ],
};
