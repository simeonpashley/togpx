#!/usr/bin/env node
import togpx from "./index";
import fs from "fs";
import concat from "concat-stream";

var opt = require("optimist")
  .usage("Usage: $0 FILE")
  .boolean("version")
  .describe("version", "display software version")
  .boolean("help")
  .describe("help", "print this help message");
var argv = opt.argv;

if (argv.help) {
  opt.showHelp();
  process.exit(0);
}
if (argv.version) {
  var pack = require("./package.json");
  process.stdout.write(pack.version + "\n");
  process.exit(0);
}

if (!argv._.length) {
  opt.showHelp();
  process.exit(0);
}

(argv._.length ? fs.createReadStream(argv._[0]) : process.stdin).pipe(
  concat(convert)
);

function convert(data: Buffer) {
  process.stdout.write(togpx(JSON.parse(data.toString())));
  process.stdout.on("error", function () {});
}
