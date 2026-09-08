import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

// The browser code is plain <script> files sharing one global scope (no
// modules, no bundler), so cross-file symbols have to be declared here or
// every one of them trips no-undef.
const projectGlobals = {
  // js/variables.js
  YEAR: "writable",
  LEFT: "readonly",
  RIGHT: "readonly",
  // vendored in lib/js
  d3: "readonly",
  topojson: "readonly",
  forceBoundary: "readonly",
  // our own files
  stackedBar: "readonly",
  stackedBarChartFromMatrix: "readonly",
  scroller: "readonly",
  scrollerElections: "readonly",
  scrollVis: "readonly",
  createYearOdometer: "readonly",
  rebind: "readonly",
  titleCase: "readonly",
  compareCities: "readonly",
};

export default [
  {
    ignores: [
      "lib/**",
      "node_modules/**",
      // Dead code: not loaded by index.html, and it references an
      // undefined `yValue`. Left in place rather than deleted.
      "js/stackedBarChartFromMatrix.js",
    ],
  },

  js.configs.recommended,

  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, ...projectGlobals },
    },
    rules: {
      // Every file both declares and consumes these shared globals, so the
      // builtin-globals check would flag each definition as a redeclaration.
      "no-redeclare": ["error", { builtinGlobals: false }],
      // Top-level names here are the cross-file API; unused *arguments* are
      // common in d3 callbacks and carry documentation value.
      "no-unused-vars": ["error", { args: "none", varsIgnorePattern: "." }],
      "no-console": "off",
    },
  },

  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },

  // Must stay last: switches off everything Prettier owns.
  prettier,
];
