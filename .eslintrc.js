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
    // indent: ["error", 2]
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
  },
};
