# Hasher (unpacked Chrome extension)

Hasher is an offline developer toolbox for hashes, HMAC, authenticated encryption, IPv4 subnet calculations, timestamps, numbers, strings, and common encodings.

This maintenance release targets Chrome Manifest V3 and is intended to be loaded with **Extensions → Developer mode → Load unpacked**. All calculations remain local; the extension contains no analytics or network requests.

## Security-related changes

- Encryption now uses authenticated **AES-256-GCM** with a random 16-byte salt, random 12-byte IV, and PBKDF2-HMAC-SHA256 (600,000 iterations).
- Ciphertext is versioned as `hasher:v2:<iterations>:<salt>:<iv>:<ciphertext-and-tag>` using Base64url fields.
- The former CryptoJS password-based AES-CBC format and DES, Triple DES, Rabbit, RC4, and RC4Drop were removed. They did not provide authenticated encryption and should not be used for new data.
- Old ciphertext is intentionally not decrypted by this release. Keep an older offline copy temporarily if existing data still needs to be migrated.
- MD4, MD5, SHA-1, RIPEMD-160, and Whirlpool remain available only for compatibility and are marked **Legacy** in the interface.

## Dependency replacement

- Browser-native Web Crypto provides secure random values, PBKDF2, and AES-GCM.
- `hash-wasm` 4.12.0 replaces the old collection of CryptoJS and hand-copied hash implementations. It is bundled locally, has no runtime dependencies, and supports the legacy algorithms Web Crypto does not expose.
- jQuery was removed; the UI uses browser DOM APIs.

The Manifest V3 CSP permits local WebAssembly execution (`wasm-unsafe-eval`) for the bundled hashing library. No remotely hosted code is loaded.

## Development

Requires Node.js 20 or newer for the test suite only; the unpacked extension itself has no build step.

```text
npm test
```

## Supported tools

- Hash: MD4, MD5, SHA-1, SHA-224/256/384/512, RIPEMD-160, Whirlpool
- HMAC: the same families except Whirlpool
- CRC: CRC-8, CRC-16/CCITT-0, FCS-16, CRC-32 over UTF-8 bytes
- Cipher: AES-256-GCM encrypt/decrypt
- Net: strict IPv4 and subnet calculations, including CIDR `/0` through `/32`
- Time: Unix timestamps, local/UTC DATETIME, RFC 1123, ISO 8601
- Numbers: lossless decimal/hex/binary conversion with `BigInt`, canonical Roman numerals (1–3999)
- Strings/encoding: strict ASCII, UTF-8, UTF-16BE, hex, Base64, URI, HTML, and ROT13 conversion

Original project by Sergey Novikov: <https://github.com/s12v/hasher>
