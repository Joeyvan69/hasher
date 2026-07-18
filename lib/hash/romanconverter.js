(function (root) {
  "use strict";

  const TOKENS = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];

  class RomanConverter {
    decToRoman(input) {
      const value = String(input).trim();
      if (!/^\d+$/.test(value)) throw new Error("Roman numerals require an integer from 1 to 3999.");
      let number = Number(value);
      if (!Number.isSafeInteger(number) || number < 1 || number > 3999) {
        throw new Error("Roman numerals are supported from 1 to 3999.");
      }
      let result = "";
      for (const [amount, symbol] of TOKENS) {
        while (number >= amount) {
          result += symbol;
          number -= amount;
        }
      }
      return result;
    }

    romanToDec(input) {
      const value = String(input).trim().toUpperCase();
      if (!/^[MDCLXVI]+$/.test(value)) throw new Error("Invalid Roman numeral.");
      let result = 0;
      let position = 0;
      for (const [amount, symbol] of TOKENS) {
        while (value.slice(position, position + symbol.length) === symbol) {
          result += amount;
          position += symbol.length;
        }
      }
      if (position !== value.length || this.decToRoman(result) !== value) {
        throw new Error("Roman numeral is not in canonical form.");
      }
      return result;
    }
  }

  root.RomanConverter = RomanConverter;
})(globalThis);
