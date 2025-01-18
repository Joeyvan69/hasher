const numbers = {
  decToHex: function (str) {
      if (/[^\d]/.test(str)) {
          return "NaN";
      }
    const num = parseInt(str, 10);
    if (isNaN(num)) {
        return "NaN";
    }
    return num.toString(16);
  },
  hexToDec: function (str) {
      if (/[^0-9a-fA-F]/.test(str)) {
          return "NaN";
      }
     return parseInt(str, 16).toString(10);
  },
  decToBin: function (str) {
    if (/[^\d]/.test(str)) {
      return "NaN";
    }
    const num = parseInt(str, 10);
    if (isNaN(num)) {
      return "NaN";
    }
    return num.toString(2);
  },
  binToDec: function (str) {
    if (/[^01]/.test(str)) {
      return "NaN";
    }
      return parseInt(str, 2).toString(10);
  },
  convert: function (str, from, to) {
      if (from < 2 || from > 36 || to < 2 || to > 36) {
          return "NaN";
      }
      if (str.length === 0) {
          return "";
      }
    const code = parseInt(str, from);
      if (isNaN(code)) {
          return "NaN";
      }
      return code.toString(to);
  }
};