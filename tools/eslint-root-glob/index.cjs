// GHSA-vfj7-8cjw-p6xm: braces <=3.0.3 has no patched release.
// Next's ESLint plugin uses only globSync(pattern, { onlyDirectories: true }).
// Keep this override scoped to that plugin; this is not a general fast-glob shim.
// Revisit when upstream no longer depends on the vulnerable glob chain.
// Next loads its glob dependency via require, including on Node 22.
/* eslint-disable @typescript-eslint/no-require-imports */
const { globSync } = require("tinyglobby");
const { isAbsolute } = require("node:path");

exports.globSync = (patterns, options = {}) => globSync(patterns, {
  ...options,
  // tinyglobby otherwise expands literal directories into all descendants.
  expandDirectories: false,
  // fast-glob preserves absolute input paths; tinyglobby defaults to relative.
  absolute: options.absolute ?? (typeof patterns === "string" && isAbsolute(patterns)),
}).map((entry) => {
  // fast-glob does not append directory separators unless explicitly requested.
  if (options.markDirectories || entry === "/" || /^[A-Za-z]:\/$/.test(entry)) return entry;
  return entry.replace(/\/$/, "");
});
