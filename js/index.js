import { readFileSync } from "fs";
import { parse } from "./cotn.js";

const cotn = readFileSync(process.argv[2]);
const out = parse(cotn.toString());
console.dir(out, { depth: 100 });
