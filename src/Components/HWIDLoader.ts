import fs from "node:fs";

export const MAC_ADDR: string = fs.readFileSync("/sys/class/net/eth0/address", 'utf8').replace(/:/g, '').replace("\n", "")
export const HWID_EXTRA_RANDOM: string = fs.readFileSync("/boot/hwid_supplemental_random", 'utf8')
export const SECURE_RANDOM: string = fs.readFileSync("/boot/sec_random", 'utf8')
export const SN: string = fs.readFileSync("/sys/firmware/devicetree/base/serial-number", "utf-8")
export const HWID_STRING: string = (SN + HWID_EXTRA_RANDOM + MAC_ADDR).replace(/\0/g, '');

