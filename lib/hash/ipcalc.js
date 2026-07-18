(function (root) {
  "use strict";

  const UINT32_MAX = 0xffffffff;

  function parseIpv4(value) {
    const parts = value.split(".");
    if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
    const octets = parts.map(Number);
    if (octets.some((octet) => octet < 0 || octet > 255)) return null;
    return (((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]) >>> 0;
  }

  function prefixToMask(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
    return prefix === 0 ? 0 : (UINT32_MAX << (32 - prefix)) >>> 0;
  }

  function maskToPrefix(mask) {
    let seenZero = false;
    let prefix = 0;
    for (let bit = 31; bit >= 0; bit -= 1) {
      const set = Boolean(mask & (2 ** bit));
      if (set && seenZero) return null;
      if (set) prefix += 1;
      else seenZero = true;
    }
    return prefix;
  }

  class IpCalc {
    constructor(input) {
      this.reset();
      if (input !== undefined) this.parse(input);
    }

    reset() {
      this.ip = null;
      this.netmask = null;
      this.prefix = null;
      this.ipValid = false;
      this.netmaskValid = false;
    }

    parse(input) {
      this.reset();
      const value = String(input ?? "").trim();
      if (!value) return this;

      const match = value.match(/^([^/\s]+)(?:\/([^/\s]+))?$/);
      if (!match) return this;

      const address = match[1];
      if (/^\d+$/.test(address) && !address.includes(".")) {
        const decimal = BigInt(address);
        if (decimal <= BigInt(UINT32_MAX)) {
          this.ip = Number(decimal);
          this.ipValid = true;
        }
      } else {
        this.ip = parseIpv4(address);
        this.ipValid = this.ip !== null;
      }
      if (!this.ipValid || match[2] === undefined) return this;

      const maskPart = match[2];
      if (/^\d{1,2}$/.test(maskPart)) {
        this.prefix = Number(maskPart);
        this.netmask = prefixToMask(this.prefix);
      } else {
        this.netmask = parseIpv4(maskPart);
        this.prefix = this.netmask === null ? null : maskToPrefix(this.netmask);
      }
      this.netmaskValid = this.netmask !== null && this.prefix !== null;
      if (!this.netmaskValid) {
        this.netmask = null;
        this.prefix = null;
      }
      return this;
    }

    getIp() { return this.ip; }
    getNetmask() { return this.netmask; }
    getPrefix() { return this.prefix; }
    isIpValid() { return this.ipValid; }
    isNetmaskValid() { return this.netmaskValid; }

    requireSubnet() {
      if (!this.ipValid || !this.netmaskValid) throw new Error("A valid IPv4 subnet is required.");
    }

    getNetwork() {
      this.requireSubnet();
      return (this.ip & this.netmask) >>> 0;
    }

    getBroadcast() {
      this.requireSubnet();
      return (this.getNetwork() | (~this.netmask >>> 0)) >>> 0;
    }

    getHostMin() {
      const network = this.getNetwork();
      return this.prefix >= 31 ? network : network + 1;
    }

    getHostMax() {
      const broadcast = this.getBroadcast();
      return this.prefix >= 31 ? broadcast : broadcast - 1;
    }

    getHostCount() {
      this.requireSubnet();
      if (this.prefix === 32) return 1;
      if (this.prefix === 31) return 2;
      return (2 ** (32 - this.prefix)) - 2;
    }

    gethHostMin() { return this.getHostMin(); }
    gethHostMax() { return this.getHostMax(); }
    gethHostCount() { return this.getHostCount(); }

    intToOctetString(value) {
      if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) throw new Error("IPv4 value is outside the 32-bit range.");
      return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join(".");
    }

    getPaddedBinString(value) {
      if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) throw new Error("IPv4 value is outside the 32-bit range.");
      return value.toString(2).padStart(32, "0");
    }
  }

  root.ipCalc = IpCalc;
})(globalThis);
