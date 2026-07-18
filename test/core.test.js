"use strict";

const assert = require("node:assert/strict");
const cryptoModule = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
global.hashwasm = require(path.join(projectRoot, "lib/hash-wasm/4.12.0/hash-wasm.umd.min.js"));
if (!global.crypto) {
  Object.defineProperty(global, "crypto", { value: cryptoModule.webcrypto, configurable: true });
}

for (const file of ["lib/hash/crc.js", "lib/hash/ipcalc.js", "lib/hash/romanconverter.js", "hasher.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(projectRoot, file), "utf8"), { filename: file });
}

async function result(tab, id, input, password = "") {
  const values = await HasherCore.calculateTab(tab, input, password);
  return values.find((item) => item.id === id);
}

test("hashes match published abc test vectors", async () => {
  assert.equal((await result(tabs.hash, "hash-md4", "abc")).value, "a448017aaf21d8525fc10ae87aa6729d");
  assert.equal((await result(tabs.hash, "hash-md5", "abc")).value, "900150983cd24fb0d6963f7d28e17f72");
  assert.equal((await result(tabs.hash, "hash-sha256", "abc")).value, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal((await result(tabs.hash, "hash-whirlpool", "abc")).value, "4e2448a4c6f486bb16b6562c73b4020bf3043e3a731bce721ae1b303d97e6d4c7181eebdb6c57e277d0e34957114cbd6c797fc9d95d8b582d225292076d4eef5");
});

test("hash and HMAC inputs use UTF-8 without truncating Unicode code points", async () => {
  assert.equal((await result(tabs.hash, "hash-md4", "😀")).value, await hashwasm.md4(new TextEncoder().encode("😀")));
  assert.equal((await result(tabs.hmac, "hmac-sha384", "The quick brown fox jumps over the lazy dog", "key")).value,
    "d7f4727e2c0b39ae0f1e40cc96f60242d5b7801841cea6fc592c5d3e1ae50700582a96cf35e1e554995fe4e03381c237");
});

test("CRC functions operate on UTF-8 bytes and retain standard ASCII vectors", () => {
  assert.equal(Hex8(Crc8Str("123456789")), "0xFC");
  assert.equal(Hex16(Crc16Str("123456789")), "0x31C3");
  assert.equal(Hex16(Fcs16Str("123456789")), "0x906E");
  assert.equal(Hex32(Crc32Str("123456789")), "0xCBF43926");
  assert.equal(Hex32(Crc32Str("é")), "0x0E048D3E");
});

test("IPv4 parser is anchored and accepts every valid CIDR edge", () => {
  assert.equal(new ipCalc("192.168.1.1junk").isIpValid(), false);
  assert.equal(new ipCalc("192.168.1.1/255.0.255.0").isNetmaskValid(), false);

  const all = new ipCalc("203.0.113.5/0");
  assert.equal(all.intToOctetString(all.getNetwork()), "0.0.0.0");
  assert.equal(all.intToOctetString(all.getBroadcast()), "255.255.255.255");

  const pointToPoint = new ipCalc("192.0.2.10/31");
  assert.equal(pointToPoint.getHostCount(), 2);
  assert.equal(pointToPoint.intToOctetString(pointToPoint.getHostMin()), "192.0.2.10");
  assert.equal(pointToPoint.intToOctetString(pointToPoint.getHostMax()), "192.0.2.11");

  const host = new ipCalc("192.0.2.10/32");
  assert.equal(host.getHostCount(), 1);
  assert.equal(host.getHostMin(), host.getHostMax());
});

test("number and Roman conversions are exact and strict", async () => {
  assert.equal((await result(tabs.number, "number-dec-hex", "900719925474099312345")).value, "30d40000000001b6d9");
  assert.equal((await result(tabs.number, "number-hex-dec", "-0xff")).value, "-255");
  assert.equal((await result(tabs.number, "number-dec-roman", "1994")).value, "MCMXCIV");
  assert.equal((await result(tabs.number, "number-roman-dec", "MCMXCIV")).value, "1994");
  assert.match((await result(tabs.number, "number-roman-dec", "IIII")).error, /canonical/i);
});

test("string and encoding conversions reject ambiguous or invalid input", async () => {
  assert.match((await result(tabs.string, "string-hex-utf8", "f")).error, /even number/i);
  assert.match((await result(tabs.string, "string-ascii-hex", "é")).error, /ASCII/i);
  assert.match((await result(tabs.encode, "encode-base64-text", "abcde")).error, /Base64/i);
  assert.match((await result(tabs.encode, "encode-base64-text", "TR==")).error, /Base64/i);
  assert.match((await result(tabs.encode, "encode-base64-text", "TQ=")).error, /Base64/i);
  assert.equal((await result(tabs.encode, "decode-html", "&amp;lt;")).value, "&lt;");
});

test("negative Unix timestamps are parsed as numeric seconds", async () => {
  assert.equal((await result(tabs.time, "time-iso8601", "-1")).value, "1969-12-31T23:59:59.000Z");
});

test("AES-GCM round-trips Unicode and detects tampering", async () => {
  const ciphertext = await HasherCore.encrypt("hello 世界", "correct horse battery staple");
  assert.match(ciphertext, /^hasher:v2:600000:/);
  assert.equal(await HasherCore.decrypt(ciphertext, "correct horse battery staple"), "hello 世界");
  const tampered = `${ciphertext.slice(0, -1)}${ciphertext.endsWith("A") ? "B" : "A"}`;
  await assert.rejects(() => HasherCore.decrypt(tampered, "correct horse battery staple"), /Decryption failed/);
});

test("each calculator reports its own error and input has a safety limit", async () => {
  const values = await HasherCore.calculateTab(tabs.encode, "%", "");
  assert.match(values.find((item) => item.id === "decode-uri").error, /URI malformed/);
  assert.equal(values.find((item) => item.id === "encode-uri").error, null);
  await assert.rejects(() => HasherCore.calculateTab(tabs.hash, "x".repeat(HasherCore.MAX_INPUT_BYTES + 1)), /4 MiB/);
});
