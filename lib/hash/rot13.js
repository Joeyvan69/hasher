const Rot13 = function () {
  const normalChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const rotChars = "nopqrstuvwxyzabcdefghijklmNOPQRSTUVWXYZABCDEFGHIJKLM";
  const charMap = [];

  for (let i = 0; i < normalChars.length; i++) {
    charMap[normalChars.charCodeAt(i)] = rotChars[i];
  }

  this.encode = function(text) {
      const result = [];
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        result.push(charMap[charCode] || text[i]);
      }
      return result.join('');
  }
}