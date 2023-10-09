#!/usr/bin/env node
import { togpx, getCounties } from "./index";
import fs from "fs";

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

const counties: { county: string; output?: string }[] = [
  { county: "Cumbria", output: "cumbria" },
  { county: "Northumberland", output: "northumberland" },
  { county: "Bedfordshire", output: "bedfordshire" },
  { county: "Essex", output: "essex" },
  { county: "Cambridgeshire", output: "cambridgeshire" },
  { county: "Hertfordshire", output: "hertfordshire" },
  { county: "Norfolk", output: "norfolk" },
  { county: "Leicestershire", output: "leicestershire" },
  { county: "Nottinghamshire", output: "nottinghamshire" },
  { county: "Suffolk", output: "suffolk" },
  { county: "Wiltshire", output: "wiltshire" },
  { county: "Denbighshire", output: "denbighshire" },
  { county: "Conwy", output: "conwy" },
  { county: "Gwynedd", output: "gwynedd" },
  { county: "Flintshire", output: "flintshire" },
  { county: "Neath Port Talbot", output: "neath_port talbot" },
  { county: "Newport", output: "newport" },
  { county: "Monmouthshire", output: "monmouthshire" },
  { county: "Merthyr Tydfil", output: "merthyr_tydfil" },
  { county: "Rhondda", output: "rhondda" },
  { county: "Devon", output: "devon" },
  { county: "Cornwall", output: "cornwall" },
  { county: "London Borough of Bromley", output: "london_borough of bromley" },
  { county: "Surrey", output: "surrey" },
  { county: "Herefordshire", output: "herefordshire" },
  { county: "Bridgend", output: "bridgend" },
  { county: "Vale of Glamorgan", output: "vale_of glamorgan" },
  { county: "Torfaen", output: "torfaen" },
  { county: "Cardiff", output: "cardiff" },
  { county: "Northamptonshire", output: "northamptonshire" },
  { county: "Caerphilly", output: "caerphilly" },
  { county: "Gloucestershire", output: "gloucestershire" },
  { county: "Oxfordshire", output: "oxfordshire" },
  { county: "Gwent", output: "gwent" },
  { county: "Kent", output: "kent" },
  { county: "Carmarthenshire", output: "carmarthenshire" },
  { county: "Shropshire", output: "shropshire" },
  { county: "Somerset", output: "somerset" },
  { county: "Swansea", output: "swansea" },
  { county: "Buckinghamshire", output: "buckinghamshire" },
  { county: "Ceredigion", output: "ceredigion" },
  { county: "Isle of Wight", output: "isle_of wight" },
  { county: "Pembrokeshire", output: "pembrokeshire" },
  { county: "East Sussex", output: "east_sussex" },
  { county: "West Sussex", output: "west_sussex" },
  { county: "West Yorkshire", output: "west_yorkshire" },
  { county: "South Yorkshire", output: "south_yorkshire" },
  { county: "Yorkshire East Riding", output: "yorkshire_east riding" },
  { county: "Dorset", output: "dorset" },
  { county: "Berkshire", output: "berkshire" },
  {
    county: "Bath and North East Somerset UA",
    output: "bath_and north east somerset ua",
  },
  { county: "North Somerset UA", output: "north_somerset ua" },
  { county: "South Gloucestershire UA", output: "south_gloucestershire ua" },
  { county: "North Yorkshire", output: "north_yorkshire" },
  { county: "Worcestershire", output: "worcestershire" },
  { county: "Warwickshire", output: "warwickshire" },
  { county: "Powys", output: "powys" },
  { county: "Durham", output: "durham" },
  { county: "Derbyshire", output: "derbyshire" },
  { county: "Staffordshire", output: "staffordshire" },
  { county: "Rutland", output: "rutland" },
  { county: "Hampshire", output: "hampshire" },
  { county: "Cheshire East", output: "cheshire_east" },
  { county: "Wrexham", output: "wrexham" },
  { county: "Lincolnshire", output: "lincolnshire" },
  { county: "Lancashire", output: "lancashire" },
  { county: "Cheshire West", output: "cheshire_west" },
];
const fileIn = fs.readFileSync(argv._[0]);
const dataIn = JSON.parse(fileIn.toString());

getCounties(dataIn);
for (const county of counties) {
  const data = togpx(dataIn, county.county);
  let output = county.output;
  if (!output) {
    output = county.county.toLowerCase().replace(" ", "_");
  }
  fs.writeFileSync(`gpx/${output}.gpx`, data);
}

