import fs from "node:fs";

export const MAC_ADDR: string = "b827eb26daef"
export const HWID_EXTRA_RANDOM: string = "SC7Rl5pWKoc4mp2y"
 
export const SN: string = "00000000d326daef"
export const HWID_STRING: string = (SN + HWID_EXTRA_RANDOM + MAC_ADDR).replace(/\0/g, '');

console.log("SERIAL", SN)
console.log("SUPPLEMENTAL RANDOM", HWID_EXTRA_RANDOM)
console.log("MAC ADDR", MAC_ADDR)
   