#!/usr/bin/env node
"use strict";

// Thin CommonJS shim. The package stays CJS (no "type":"module") so this and
// gsd-tools.cjs can require() the compiled overlay without ESM interop.
require("../dist/cli/index.js")
  .main(process.argv.slice(2))
  .catch((err) => {
    process.stderr.write(`${err && err.stack ? err.stack : String(err)}\n`);
    process.exitCode = 1;
  });
