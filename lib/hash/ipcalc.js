const ipCalc = function(str) {
  /* Private variables */
  let ip;
  let netmask;
  let network;
  let broadcast;
  let hostMin;
  let hostMax;
  let ipValid = true;
  let netmaskValid = true;

  /* Private methods */
  const reset = () => {
      ip = null;
      ipValid = true;
      netmask = null;
      netmaskValid = true;
      network = null;
      broadcast = null;
      hostMin = null;
      hostMax = null;
  };

  const octetsToInt = (o1, o2, o3, o4) => {
      return (((o1 << 24) >>> 0) + ((o2 << 16) >>> 0) + ((o3 << 8) >>> 0) + (o4 >>> 0));
  };

  const bitsToInt = (bits) => {
      if (bits > 0 && bits <= 32) {
          return (Math.pow(2, 32) - Math.pow(2, 32 - bits)) >>> 0;
      } else if (bits === 0) {
          return 0;
      } else {
          return NaN;
      }
  };
  
  const getAnd = (i1, i2) => {
    return (i1 & i2) >>> 0;
  };
  
  const getBroadcast = (ip, netmask) => {
    return (ip | (~netmask)) >>> 0;
  };
    
  const validNetMasks = new Set([
    2147483648, 3221225472, 3758096384, 4026531840, 4160749568,
    4227858432, 4261412864, 4278190080, 4286578688, 4290772992,
    4292870144, 4293918720, 4294443008, 4294705152, 4294836224,
    4294901760, 4294934528, 4294950912, 4294959104, 4294963200,
    4294965248, 4294966272, 4294966784, 4294967040, 4294967168,
    4294967232, 4294967264, 4294967280, 4294967288, 4294967292
  ]);

  const validateNetmask = () => {
    if (!validNetMasks.has(netmask)) {
      netmaskValid = false;
      netmask = null;
    } else {
      netmaskValid = true;
    }
  };

  const validateIp = () => {
      if (ip >= 0 && ip <= 4294967295) {
          ipValid = true;
      } else {
          ip = null;
          ipValid = false;
      }
  };

  /* Public methods */
  this.parse = (str) => {
      reset();

      let matches;
      if ((matches = /(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)\.(\d+)\.(\d+)\.(\d+)/.exec(str))) {
          if (matches.length === 9 &&
              matches[1] >= 0 && matches[2] >= 0 && matches[3] >= 0 && matches[4] >= 0 && matches[5] >= 0 && matches[6] >= 0 && matches[7] >= 0 && matches[8] >= 0 &&
              matches[1] <= 255 && matches[2] <= 255 && matches[3] <= 255 && matches[4] <= 255 && matches[5] <= 255 && matches[6] <= 255 && matches[7] <= 255 && matches[8] <= 255) {
              ip = octetsToInt(parseInt(matches[1], 10), parseInt(matches[2], 10), parseInt(matches[3], 10), parseInt(matches[4], 10));
              netmask = octetsToInt(parseInt(matches[5], 10), parseInt(matches[6], 10), parseInt(matches[7], 10), parseInt(matches[8], 10));
              validateIp();
              validateNetmask();
          }
      } else if ((matches = /(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)/.exec(str))) {
          if (matches.length === 6 &&
              matches[1] >= 0 && matches[2] >= 0 && matches[3] >= 0 && matches[4] >= 0 && matches[5] >= 0 &&
              matches[1] <= 255 && matches[2] <= 255 && matches[3] <= 255 && matches[4] <= 255 && matches[5] <= 32) {
              ip = octetsToInt(parseInt(matches[1], 10), parseInt(matches[2], 10), parseInt(matches[3], 10), parseInt(matches[4], 10));
              netmask = bitsToInt(parseInt(matches[5], 10));
              validateIp();
              validateNetmask();
          }
      } else if ((matches = /(\d+)\.(\d+)\.(\d+)\.(\d+)/.exec(str))) {
          if (matches.length === 5 &&
              matches[1] >= 0 && matches[2] >= 0 && matches[3] >= 0 && matches[4] >= 0 &&
              matches[1] <= 255 && matches[2] <= 255 && matches[3] <= 255 && matches[4] <= 255) {
              ip = octetsToInt(parseInt(matches[1], 10), parseInt(matches[2], 10), parseInt(matches[3], 10), parseInt(matches[4], 10));
              validateIp();
          }
      } else if (/^(\s*)(\d+)/.test(str)) {
          ip = parseInt(str, 10);
          validateIp();
      }

      if (ip != null && netmask != null) {
          network = getAnd(ip, netmask);
          broadcast = getBroadcast(ip, netmask);
          hostMin = (network + 1) >>> 0;
          hostMax = (broadcast - 1) >>> 0;
      }
  };

  this.intToOctetString = (val) => {
    return ((val >>> 24) >>> 0) + '.' + ((val >>> 16) & 255) + '.' + ((val >>> 8) & 255) + '.' + (val & 255);    
  };
      
  this.getIp = () => ip;
  this.getNetmask = () => netmask;
  this.getNetwork = () => network;
  this.getBroadcast = () => broadcast;
  this.gethHostMin = () => hostMin;
  this.gethHostMax = () => hostMax;
  this.gethHostCount = () => (broadcast - network - 1);
  this.isNetmaskValid = () => netmaskValid;
  this.isIpValid = () => ipValid;

  /* Constructor */
  this.parse(str);
}