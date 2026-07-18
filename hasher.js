(function (root) {
  "use strict";

  const tabs = Object.freeze({
    hash: "hash",
    hmac: "hmac",
    crc: "crc",
    cipher: "cipher",
    net: "net",
    time: "time",
    number: "number",
    string: "string",
    encode: "encode"
  });

  const MAX_INPUT_BYTES = 4 * 1024 * 1024;
  const PBKDF2_ITERATIONS = 600000;
  const CIPHER_PREFIX = "hasher:v2";
  const utf8Encoder = new TextEncoder();
  const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

  function requireHashWasm() {
    if (!root.hashwasm) {
      throw new Error("The hashing library did not load. Reload the extension and try again.");
    }
    return root.hashwasm;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function hexToBytes(value) {
    const input = value.trim();
    if (input.length % 2 !== 0) throw new Error("Hex input must contain complete bytes (an even number of digits).");
    if (!/^[0-9a-f]*$/i.test(input)) throw new Error("Hex input contains a non-hexadecimal character.");
    const result = new Uint8Array(input.length / 2);
    for (let index = 0; index < result.length; index += 1) {
      result[index] = Number.parseInt(input.slice(index * 2, index * 2 + 2), 16);
    }
    return result;
  }

  function bytesToBase64(bytes) {
    if (typeof btoa === "function") {
      let binary = "";
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }
    return Buffer.from(bytes).toString("base64");
  }

  function base64ToBytes(value, urlSafe = false) {
    let input = value.replace(/\s+/g, "");
    if (urlSafe) input = input.replace(/-/g, "+").replace(/_/g, "/");
    const hasPadding = input.includes("=");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input) || input.length % 4 === 1 || (hasPadding && input.length % 4 !== 0) || /=/.test(input.slice(0, -2))) {
      throw new Error("Invalid Base64 input.");
    }
    input = input.replace(/=+$/, "");
    input += "=".repeat((4 - (input.length % 4)) % 4);
    try {
      let bytes;
      if (typeof atob === "function") {
        const binary = atob(input);
        bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      } else {
        bytes = new Uint8Array(Buffer.from(input, "base64"));
      }
      if (bytesToBase64(bytes) !== input) throw new Error("Invalid Base64 input.");
      return bytes;
    } catch (_error) {
      throw new Error("Invalid Base64 input.");
    }
  }

  function bytesToBase64Url(bytes) {
    return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function parseInteger(input, radix, label) {
    const value = input.trim();
    const patterns = {
      2: /^[+-]?[01]+$/,
      10: /^[+-]?\d+$/,
      16: /^[+-]?(?:0x)?[0-9a-f]+$/i
    };
    if (!patterns[radix].test(value)) throw new Error(`Invalid ${label} integer.`);
    const sign = value.startsWith("-") ? -1n : 1n;
    const unsigned = value.replace(/^[+-]/, "").replace(/^0x/i, "");
    const prefix = radix === 2 ? "0b" : radix === 16 ? "0x" : "";
    return sign * BigInt(prefix + unsigned);
  }

  function formatInteger(value, radix) {
    return value < 0n ? `-${(-value).toString(radix)}` : value.toString(radix);
  }

  function parseDate(input) {
    const value = input.trim();
    if (!value) throw new Error("Enter a Unix timestamp or date.");
    const numeric = /^[+-]?\d+(?:\.\d+)?$/.test(value);
    const date = numeric ? new Date(Number(value) * 1000) : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error("Invalid date or Unix timestamp.");
    return date;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatSqlDate(date, utc) {
    const get = (name) => date[`${utc ? "getUTC" : "get"}${name}`]();
    return `${get("FullYear")}-${pad(get("Month") + 1)}-${pad(get("Date"))} ${pad(get("Hours"))}:${pad(get("Minutes"))}:${pad(get("Seconds"))}`;
  }

  function rot13(input) {
    return input.replace(/[A-Za-z]/g, (character) => {
      const base = character <= "Z" ? 65 : 97;
      return String.fromCharCode(((character.charCodeAt(0) - base + 13) % 26) + base);
    });
  }

  function encodeHtml(input) {
    return input.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function decodeHtml(input) {
    return input.replace(/&(amp|lt|gt|quot|#39|#x27);/gi, (entity) => ({
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": "\"",
      "&#39;": "'",
      "&#x27;": "'"
    })[entity.toLowerCase()]);
  }

  function asciiToBytes(input) {
    const bytes = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      const code = input.charCodeAt(index);
      if (code > 0x7f) throw new Error("ASCII supports character codes 0 through 127 only.");
      bytes[index] = code;
    }
    return bytes;
  }

  function bytesToAscii(bytes) {
    if (bytes.some((byte) => byte > 0x7f)) throw new Error("The byte sequence contains non-ASCII values.");
    let result = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      result += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return result;
  }

  function utf16BeToHex(input) {
    const bytes = new Uint8Array(input.length * 2);
    for (let index = 0; index < input.length; index += 1) {
      const code = input.charCodeAt(index);
      bytes[index * 2] = code >>> 8;
      bytes[index * 2 + 1] = code & 0xff;
    }
    return bytesToHex(bytes);
  }

  function hexToUtf16Be(input) {
    const bytes = hexToBytes(input);
    if (bytes.length % 2 !== 0) throw new Error("UTF-16BE hex input must contain complete 16-bit code units.");
    let output = "";
    for (let index = 0; index < bytes.length; index += 2) {
      output += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    }
    return output;
  }

  async function hash(factory, input) {
    const library = requireHashWasm();
    return library[factory](utf8Encoder.encode(input));
  }

  async function hmac(factory, input, key) {
    const library = requireHashWasm();
    const calculator = await library.createHMAC(library[factory](), utf8Encoder.encode(key));
    calculator.update(utf8Encoder.encode(input));
    return calculator.digest("hex");
  }

  function getCrypto() {
    if (!root.crypto || !root.crypto.subtle) throw new Error("Web Crypto is unavailable in this context.");
    return root.crypto;
  }

  async function deriveAesKey(password, salt, iterations) {
    if (!password) throw new Error("A password is required.");
    const webCrypto = getCrypto();
    const material = await webCrypto.subtle.importKey("raw", utf8Encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
    return webCrypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encrypt(input, password) {
    const webCrypto = getCrypto();
    const salt = webCrypto.getRandomValues(new Uint8Array(16));
    const iv = webCrypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(password, salt, PBKDF2_ITERATIONS);
    const encrypted = new Uint8Array(await webCrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, utf8Encoder.encode(input)));
    return [CIPHER_PREFIX, PBKDF2_ITERATIONS, bytesToBase64Url(salt), bytesToBase64Url(iv), bytesToBase64Url(encrypted)].join(":");
  }

  async function decrypt(input, password) {
    const parts = input.trim().split(":");
    if (parts.length !== 6 || `${parts[0]}:${parts[1]}` !== CIPHER_PREFIX) {
      throw new Error("Unsupported ciphertext format. Expected a Hasher v2 AES-GCM value.");
    }
    const iterations = Number(parts[2]);
    if (!Number.isSafeInteger(iterations) || iterations < 100000 || iterations > 2000000) {
      throw new Error("Ciphertext contains an unsafe PBKDF2 iteration count.");
    }
    const salt = base64ToBytes(parts[3], true);
    const iv = base64ToBytes(parts[4], true);
    const ciphertext = base64ToBytes(parts[5], true);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) throw new Error("Ciphertext parameters are invalid.");
    const webCrypto = getCrypto();
    const key = await deriveAesKey(password, salt, iterations);
    try {
      const plaintext = await webCrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      return utf8Decoder.decode(plaintext);
    } catch (_error) {
      throw new Error("Decryption failed. Check the password and ciphertext integrity.");
    }
  }

  function ipResult(input, selector, requiresMask = false) {
    const calculator = new root.ipCalc();
    calculator.parse(input);
    if (!calculator.isIpValid()) throw new Error("Invalid IPv4 address or decimal value.");
    if (requiresMask && !calculator.isNetmaskValid()) throw new Error("Add a valid CIDR prefix or contiguous dotted netmask.");
    return selector(calculator);
  }

  const elements = [
    { id: "hash-md4", tab: tabs.hash, title: "MD4", legacy: true, calculate: (input) => hash("md4", input) },
    { id: "hash-md5", tab: tabs.hash, title: "MD5", legacy: true, calculate: (input) => hash("md5", input) },
    { id: "hash-sha1", tab: tabs.hash, title: "SHA-1", legacy: true, calculate: (input) => hash("sha1", input) },
    { id: "hash-sha224", tab: tabs.hash, title: "SHA-224", calculate: (input) => hash("sha224", input) },
    { id: "hash-sha256", tab: tabs.hash, title: "SHA-256", calculate: (input) => hash("sha256", input) },
    { id: "hash-sha384", tab: tabs.hash, title: "SHA-384", calculate: (input) => hash("sha384", input) },
    { id: "hash-sha512", tab: tabs.hash, title: "SHA-512", calculate: (input) => hash("sha512", input) },
    { id: "hash-ripemd160", tab: tabs.hash, title: "RIPEMD-160", legacy: true, calculate: (input) => hash("ripemd160", input) },
    { id: "hash-whirlpool", tab: tabs.hash, title: "Whirlpool", legacy: true, calculate: (input) => hash("whirlpool", input) },

    { id: "hmac-md4", tab: tabs.hmac, title: "HMAC-MD4", legacy: true, calculate: (input, key) => hmac("createMD4", input, key) },
    { id: "hmac-md5", tab: tabs.hmac, title: "HMAC-MD5", legacy: true, calculate: (input, key) => hmac("createMD5", input, key) },
    { id: "hmac-sha1", tab: tabs.hmac, title: "HMAC-SHA-1", legacy: true, calculate: (input, key) => hmac("createSHA1", input, key) },
    { id: "hmac-sha224", tab: tabs.hmac, title: "HMAC-SHA-224", calculate: (input, key) => hmac("createSHA224", input, key) },
    { id: "hmac-sha256", tab: tabs.hmac, title: "HMAC-SHA-256", calculate: (input, key) => hmac("createSHA256", input, key) },
    { id: "hmac-sha384", tab: tabs.hmac, title: "HMAC-SHA-384", calculate: (input, key) => hmac("createSHA384", input, key) },
    { id: "hmac-sha512", tab: tabs.hmac, title: "HMAC-SHA-512", calculate: (input, key) => hmac("createSHA512", input, key) },
    { id: "hmac-ripemd160", tab: tabs.hmac, title: "HMAC-RIPEMD-160", legacy: true, calculate: (input, key) => hmac("createRIPEMD160", input, key) },

    { id: "crc-8", tab: tabs.crc, title: "CRC-8", calculate: (input) => root.Hex8(root.Crc8Str(input)) },
    { id: "crc-16", tab: tabs.crc, title: "CRC-16/CCITT-0", calculate: (input) => root.Hex16(root.Crc16Str(input)) },
    { id: "fcs-16", tab: tabs.crc, title: "FCS-16", calculate: (input) => root.Hex16(root.Fcs16Str(input)) },
    { id: "crc-32", tab: tabs.crc, title: "CRC-32", calculate: (input) => root.Hex32(root.Crc32Str(input)) },

    { id: "cipher-encrypt", tab: tabs.cipher, title: "AES-256-GCM encrypt", calculate: encrypt },
    { id: "cipher-decrypt", tab: tabs.cipher, title: "AES-256-GCM decrypt", calculate: decrypt },

    { id: "net-decimal", tab: tabs.net, title: "IPv4 as decimal", calculate: (input) => ipResult(input, (ip) => String(ip.getIp())) },
    { id: "net-ipv4", tab: tabs.net, title: "Decimal as IPv4", calculate: (input) => ipResult(input, (ip) => ip.intToOctetString(ip.getIp())) },
    { id: "net-binary", tab: tabs.net, title: "IPv4 as binary", calculate: (input) => ipResult(input, (ip) => ip.getPaddedBinString(ip.getIp())) },
    { id: "net-hex", tab: tabs.net, title: "IPv4 as hex", calculate: (input) => ipResult(input, (ip) => `0x${ip.getIp().toString(16).padStart(8, "0")}`) },
    { id: "net-network", tab: tabs.net, title: "Network / netmask", calculate: (input) => ipResult(input, (ip) => `${ip.intToOctetString(ip.getNetwork())}/${ip.intToOctetString(ip.getNetmask())}`, true) },
    { id: "net-host-min", tab: tabs.net, title: "Minimum host", calculate: (input) => ipResult(input, (ip) => ip.intToOctetString(ip.getHostMin()), true) },
    { id: "net-host-max", tab: tabs.net, title: "Maximum host", calculate: (input) => ipResult(input, (ip) => ip.intToOctetString(ip.getHostMax()), true) },
    { id: "net-broadcast", tab: tabs.net, title: "Broadcast", calculate: (input) => ipResult(input, (ip) => ip.intToOctetString(ip.getBroadcast()), true) },
    { id: "net-host-count", tab: tabs.net, title: "Usable addresses", calculate: (input) => ipResult(input, (ip) => String(ip.getHostCount()), true) },

    { id: "time-unix", tab: tabs.time, title: "Unix timestamp", calculate: (input) => String(parseDate(input).getTime() / 1000) },
    { id: "time-local", tab: tabs.time, title: "Local time", calculate: (input) => parseDate(input).toLocaleString() },
    { id: "time-sql-local", tab: tabs.time, title: "DATETIME (local)", calculate: (input) => formatSqlDate(parseDate(input), false) },
    { id: "time-sql-utc", tab: tabs.time, title: "DATETIME (UTC)", calculate: (input) => formatSqlDate(parseDate(input), true) },
    { id: "time-rfc1123", tab: tabs.time, title: "RFC 1123", calculate: (input) => parseDate(input).toUTCString() },
    { id: "time-iso8601", tab: tabs.time, title: "ISO 8601", calculate: (input) => parseDate(input).toISOString() },

    { id: "number-dec-hex", tab: tabs.number, title: "Decimal to hex", calculate: (input) => formatInteger(parseInteger(input, 10, "decimal"), 16) },
    { id: "number-hex-dec", tab: tabs.number, title: "Hex to decimal", calculate: (input) => formatInteger(parseInteger(input, 16, "hexadecimal"), 10) },
    { id: "number-dec-bin", tab: tabs.number, title: "Decimal to binary", calculate: (input) => formatInteger(parseInteger(input, 10, "decimal"), 2) },
    { id: "number-bin-dec", tab: tabs.number, title: "Binary to decimal", calculate: (input) => formatInteger(parseInteger(input, 2, "binary"), 10) },
    { id: "number-dec-roman", tab: tabs.number, title: "Decimal to Roman", calculate: (input) => new root.RomanConverter().decToRoman(input) },
    { id: "number-roman-dec", tab: tabs.number, title: "Roman to decimal", calculate: (input) => String(new root.RomanConverter().romanToDec(input)) },

    { id: "string-ascii-hex", tab: tabs.string, title: "ASCII to hex", calculate: (input) => bytesToHex(asciiToBytes(input)) },
    { id: "string-hex-ascii", tab: tabs.string, title: "Hex to ASCII", calculate: (input) => bytesToAscii(hexToBytes(input)) },
    { id: "string-utf8-hex", tab: tabs.string, title: "UTF-8 to hex", calculate: (input) => bytesToHex(utf8Encoder.encode(input)) },
    { id: "string-hex-utf8", tab: tabs.string, title: "Hex to UTF-8", calculate: (input) => utf8Decoder.decode(hexToBytes(input)) },
    { id: "string-utf16be-hex", tab: tabs.string, title: "UTF-16BE to hex", calculate: utf16BeToHex },
    { id: "string-hex-utf16be", tab: tabs.string, title: "Hex to UTF-16BE", calculate: hexToUtf16Be },

    { id: "encode-base64", tab: tabs.encode, title: "Base64 encode", calculate: (input) => bytesToBase64(utf8Encoder.encode(input)) },
    { id: "encode-base64-text", tab: tabs.encode, title: "Base64 decode to UTF-8", calculate: (input) => utf8Decoder.decode(base64ToBytes(input)) },
    { id: "encode-base64-hex", tab: tabs.encode, title: "Base64 decode to hex", calculate: (input) => bytesToHex(base64ToBytes(input)) },
    { id: "encode-uri", tab: tabs.encode, title: "encodeURI", calculate: encodeURI },
    { id: "decode-uri", tab: tabs.encode, title: "decodeURI", calculate: decodeURI },
    { id: "encode-uri-component", tab: tabs.encode, title: "encodeURIComponent", calculate: encodeURIComponent },
    { id: "decode-uri-component", tab: tabs.encode, title: "decodeURIComponent", calculate: decodeURIComponent },
    { id: "encode-html", tab: tabs.encode, title: "HTML escape", calculate: encodeHtml },
    { id: "decode-html", tab: tabs.encode, title: "HTML unescape (one pass)", calculate: decodeHtml },
    { id: "encode-rot13", tab: tabs.encode, title: "ROT13", calculate: rot13 }
  ];

  async function calculateTab(tab, input, password = "") {
    const bytes = utf8Encoder.encode(input).length;
    if (bytes > MAX_INPUT_BYTES) throw new Error("Input exceeds the 4 MiB safety limit.");
    const active = elements.filter((element) => element.tab === tab);
    return Promise.all(active.map(async (element) => {
      try {
        const value = await element.calculate(input, password);
        return { id: element.id, title: element.title, legacy: Boolean(element.legacy), value: String(value), error: null };
      } catch (error) {
        return { id: element.id, title: element.title, legacy: Boolean(element.legacy), value: "", error: error instanceof Error ? error.message : String(error) };
      }
    }));
  }

  let updateSequence = 0;
  const hasher = {
    tab: tabs.hash,

    setTab(tab) {
      if (!Object.values(tabs).includes(tab)) throw new Error(`Unknown tab: ${tab}`);
      this.tab = tab;
      this.render();
    },

    render() {
      const output = root.document && root.document.getElementById("output");
      if (!output) return;
      output.replaceChildren();
      for (const element of elements.filter((item) => item.tab === this.tab)) {
        const article = document.createElement("article");
        article.className = "result";
        article.dataset.resultId = element.id;

        const header = document.createElement("div");
        header.className = "result-header";
        const title = document.createElement("h3");
        title.className = "result-title";
        title.id = `result-title-${element.id}`;
        title.textContent = element.title;
        header.append(title);
        if (element.legacy) {
          const badge = document.createElement("span");
          badge.className = "legacy-badge";
          badge.textContent = "Legacy";
          badge.title = "For compatibility only; do not use this algorithm for security.";
          header.append(badge);
        }
        const metadata = document.createElement("span");
        metadata.className = "result-meta";
        header.append(metadata);

        const controls = document.createElement("div");
        controls.className = "result-controls";
        const value = document.createElement("pre");
        value.id = `result-${element.id}`;
        value.className = "result-value";
        value.tabIndex = 0;
        value.setAttribute("aria-labelledby", title.id);
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "copy-button";
        copy.dataset.copyTarget = value.id;
        copy.textContent = "Copy";
        const expand = document.createElement("button");
        expand.type = "button";
        expand.className = "expand-button";
        expand.dataset.expandTarget = value.id;
        expand.textContent = "Expand";
        expand.hidden = true;
        controls.append(value, copy, expand);
        article.append(header, controls);
        output.append(article);
      }
    },

    async update() {
      const input = root.document && root.document.getElementById("input-value");
      const password = root.document && root.document.getElementById("input-password");
      const status = root.document && root.document.getElementById("status");
      if (!input || !password) return;
      const sequence = ++updateSequence;
      if (status) status.textContent = "Calculating…";
      let results;
      try {
        results = await calculateTab(this.tab, input.value, password.value);
      } catch (error) {
        if (sequence === updateSequence) {
          if (status) status.textContent = error.message;
          for (const article of document.querySelectorAll(".result")) {
            article.classList.add("result-error");
            const value = article.querySelector(".result-value");
            const metadata = article.querySelector(".result-meta");
            if (value) value.textContent = `Error: ${error.message}`;
            if (metadata) metadata.textContent = "";
          }
        }
        return;
      }
      if (sequence !== updateSequence) return;
      let errors = 0;
      for (const result of results) {
        const article = document.querySelector(`[data-result-id="${result.id}"]`);
        const value = document.getElementById(`result-${result.id}`);
        if (!article || !value) continue;
        article.classList.toggle("result-error", Boolean(result.error));
        value.textContent = result.error ? `Error: ${result.error}` : result.value;
        const meta = article.querySelector(".result-meta");
        if (meta) meta.textContent = result.error ? "" : `${utf8Encoder.encode(result.value).length} bytes`;
        const expand = article.querySelector(".expand-button");
        if (expand) {
          value.classList.remove("expanded");
          expand.textContent = "Expand";
          expand.setAttribute("aria-expanded", "false");
          expand.hidden = value.scrollHeight <= value.clientHeight + 1;
        }
        if (result.error) errors += 1;
      }
      if (status) status.textContent = errors ? `${errors} result${errors === 1 ? "" : "s"} could not be calculated.` : "";
    }
  };

  root.tabs = tabs;
  root.HasherCore = Object.freeze({
    MAX_INPUT_BYTES,
    PBKDF2_ITERATIONS,
    calculateTab,
    base64ToBytes,
    bytesToBase64,
    bytesToHex,
    hexToBytes,
    encrypt,
    decrypt
  });
  root.hasher = hasher;
})(globalThis);
