module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],

  extends: ["plugin:@typescript-eslint/recommended"],
  parserOptions: {
    ecmaVersion: 2018,
    // enables 'import'
    sourceType: "module",
  },
  rules: {
    indent: "off",
    "@typescript-eslint/indent": ["error", 2],
    "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "no-public" }],
    "@typescript-eslint/camelcase": ["warn"],
    "@typescript-eslint/no-empty-interface": ["warn"],
    "@typescript-eslint/no-use-before-define": ["warn"],
    "@typescript-eslint/no-empty-function": ["warn"],

    // indent: ["error", 2]
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
  },
};
