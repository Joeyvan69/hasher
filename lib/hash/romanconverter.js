const RomanConverter = function() {
  const romanValues = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  const decimalValues = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  
  this.decToRoman = function(str) {
      if (str.length === 0) {
          return "";
      }
      if (/[^\d]/.test(str)) {
          return "NaN";
      }
      let num = parseInt(str, 10);
      if (num <= 0 || num >= 4000) {
          return "Out of range";
      }
      const result = [];
      for(let i = 0; i < romanValues.length; i++){
          while (num >= decimalValues[i]) {
              num -= decimalValues[i];
              result.push(romanValues[i]);
          }
      }
      return result.join('');
  }

  const romanMap = {
      'M': 1000,
      'D': 500,
      'C': 100,
      'L': 50,
      'X': 10,
      'V': 5,
      'I': 1
  };

  this.romanToDec = function(str) {
      if (str.length === 0) {
          return "";
      }
      str = str.toUpperCase();
      if (/[^MDCLXVI]/.test(str)) {
          return "NaN";
      }

      let decimal = 0;
      let lastNumber = 0;

      for (let i = str.length - 1; i >= 0; i--) {
        const currentValue = romanMap[str[i]];
        if (currentValue < lastNumber) {
          decimal -= currentValue;
        } else {
          decimal += currentValue;
        }
        lastNumber = currentValue;
      }
      return decimal;
  }
}