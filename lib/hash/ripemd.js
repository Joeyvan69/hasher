/*
 * A JavaScript implementation of the RIPEMD-160 Algorithm
 * Version 2.2 Copyright Jeremy Lin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 * Also http://www.ocf.berkeley.edu/~jjlin/jsotp/
 */

var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad = ""; /* base-64 pad character. "=" for strict RFC compliance   */

function hex_rmd160(s) { return rstr2hex(rstr_rmd160(str2rstr_utf8(s))); }
function b64_rmd160(s) { return rstr2b64(rstr_rmd160(str2rstr_utf8(s))); }
function any_rmd160(s, e) { return rstr2any(rstr_rmd160(str2rstr_utf8(s)), e); }
function hex_hmac_rmd160(k, d) {
    return rstr2hex(rstr_hmac_rmd160(str2rstr_utf8(k), str2rstr_utf8(d)));
}
function b64_hmac_rmd160(k, d) {
    return rstr2b64(rstr_hmac_rmd160(str2rstr_utf8(k), str2rstr_utf8(d)));
}
function any_hmac_rmd160(k, d, e) {
    return rstr2any(rstr_hmac_rmd160(str2rstr_utf8(k), str2rstr_utf8(d)), e);
}

function rmd160_vm_test() {
    return hex_rmd160("abc").toLowerCase() == "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc";
}

function rstr_rmd160(s) {
    return binl2rstr(binl_rmd160(rstr2binl(s), s.length * 8));
}

function rstr_hmac_rmd160(key, data) {
    var bkey = rstr2binl(key);
    if (bkey.length > 16) bkey = binl_rmd160(bkey, key.length * 8);

    var ipad = Array(16), opad = Array(16);
    for (var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    var hash = binl_rmd160(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
    return binl2rstr(binl_rmd160(opad.concat(hash), 512 + 160));
}

function rstr2hex(input) {
    try { hexcase } catch (e) { hexcase = 0; }
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var output = "";
    for (var i = 0; i < input.length; i++) {
        var x = input.charCodeAt(i);
        output += hex_tab.charAt((x >>> 4) & 0x0F) + hex_tab.charAt(x & 0x0F);
    }
    return output;
}

function rstr2b64(input) {
    try { b64pad } catch (e) { b64pad = ''; }
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var output = "";
    var len = input.length;
    for (var i = 0; i < len; i += 3) {
        var triplet = (input.charCodeAt(i) << 16)
            | (i + 1 < len ? input.charCodeAt(i + 1) << 8 : 0)
            | (i + 2 < len ? input.charCodeAt(i + 2) : 0);
        for (var j = 0; j < 4; j++) {
            if (i * 8 + j * 6 > input.length * 8) output += b64pad;
            else output += tab.charAt((triplet >>> 6 * (3 - j)) & 0x3F);
        }
    }
    return output;
}

function rstr2any(input, encoding) {
    var divisor = encoding.length;
    var remainders = [];
    var dividend = [];
    
    for (var i = 0; i < input.length; i+=2) {
        dividend.push((input.charCodeAt(i) << 8) | (input.charCodeAt(i+1) || 0));
    }

    while(dividend.length > 0) {
        var quotient = [];
        var x = 0;
        for(var i = 0; i < dividend.length; i++) {
            x = (x << 16) + dividend[i];
            var q = Math.floor(x / divisor);
            x -= q * divisor;
            if(quotient.length > 0 || q > 0) {
                quotient.push(q);
            }
        }
        remainders.push(x);
        dividend = quotient;
    }
    
    var output = "";
    for (var i = remainders.length - 1; i >= 0; i--) {
        output += encoding.charAt(remainders[i]);
    }
    
    var full_length = Math.ceil(input.length * 8 / (Math.log(encoding.length) / Math.log(2)));
    for (var i = output.length; i < full_length; i++) {
        output = encoding[0] + output;
    }
    
    return output;
}

function str2rstr_utf8(input) {
    var output = "";
    var i = 0;
    while (i < input.length) {
        var x = input.charCodeAt(i++);
        if (0xD800 <= x && x <= 0xDBFF) {
            var y = input.charCodeAt(i++);
            if (0xDC00 <= y && y <= 0xDFFF) {
                x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
            } else {
                i--;
            }
        }
        if (x <= 0x7F) {
            output += String.fromCharCode(x);
        } else if (x <= 0x7FF) {
            output += String.fromCharCode(0xC0 | ((x >>> 6) & 0x1F), 0x80 | (x & 0x3F));
        } else if (x <= 0xFFFF) {
            output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F), 0x80 | ((x >>> 6) & 0x3F), 0x80 | (x & 0x3F));
        } else if (x <= 0x1FFFFF) {
            output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07), 0x80 | ((x >>> 12) & 0x3F), 0x80 | ((x >>> 6) & 0x3F), 0x80 | (x & 0x3F));
        }
    }
    return output;
}

function str2rstr_utf16le(input) {
    var output = "";
    for (var i = 0; i < input.length; i++) {
        var charCode = input.charCodeAt(i);
        output += String.fromCharCode(charCode & 0xFF, (charCode >>> 8) & 0xFF);
    }
    return output;
}

function str2rstr_utf16be(input) {
    var output = "";
    for (var i = 0; i < input.length; i++) {
        var charCode = input.charCodeAt(i);
        output += String.fromCharCode((charCode >>> 8) & 0xFF, charCode & 0xFF);
    }
    return output;
}

function rstr2binl(input) {
    var output = new Array(input.length >> 2);
    for (var i = 0; i < output.length; i++) {
        output[i] = 0;
    }
    for (var i = 0; i < input.length * 8; i += 8) {
        output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
    }
    return output;
}

function binl2rstr(input) {
    var output = "";
    for (var i = 0; i < input.length * 32; i += 8) {
        output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
    }
    return output;
}

function binl_rmd160(x, len) {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    var h0 = 0x67452301;
    var h1 = 0xefcdab89;
    var h2 = 0x98badcfe;
    var h3 = 0x10325476;
    var h4 = 0xc3d2e1f0;

    for (var i = 0; i < x.length; i += 16) {
        var T;
        var A1 = h0, B1 = h1, C1 = h2, D1 = h3, E1 = h4;
        var A2 = h0, B2 = h1, C2 = h2, D2 = h3, E2 = h4;
        for (var j = 0; j <= 79; ++j) {
            T = safe_add(A1, rmd160_f(j, B1, C1, D1));
            T = safe_add(T, x[i + rmd160_r1[j]]);
            T = safe_add(T, rmd160_K1(j));
            T = safe_add(bit_rol(T, rmd160_s1[j]), E1);
            A1 = E1; E1 = D1; D1 = bit_rol(C1, 10); C1 = B1; B1 = T;

            T = safe_add(A2, rmd160_f(79 - j, B2, C2, D2));
            T = safe_add(T, x[i + rmd160_r2[j]]);
            T = safe_add(T, rmd160_K2(j));
            T = safe_add(bit_rol(T, rmd160_s2[j]), E2);
            A2 = E2; E2 = D2; D2 = bit_rol(C2, 10); C2 = B2; B2 = T;
        }
        T = safe_add(h1, safe_add(C1, D2));
        h1 = safe_add(h2, safe_add(D1, E2));
        h2 = safe_add(h3, safe_add(E1, A2));
        h3 = safe_add(h4, safe_add(A1, B2));
        h4 = safe_add(h0, safe_add(B1, C2));
        h0 = T;
    }
    return [h0, h1, h2, h3, h4];
}

function rmd160_f(j, x, y, z) {
    if (0 <= j && j <= 15) return (x ^ y ^ z);
    if (16 <= j && j <= 31) return (x & y) | (~x & z);
    if (32 <= j && j <= 47) return (x | ~y) ^ z;
    if (48 <= j && j <= 63) return (x & z) | (y & ~z);
    if (64 <= j && j <= 79) return x ^ (y | ~z);
    return "rmd160_f: j out of range";
}

function rmd160_K1(j) {
    if (0 <= j && j <= 15) return 0x00000000;
    if (16 <= j && j <= 31) return 0x5a827999;
    if (32 <= j && j <= 47) return 0x6ed9eba1;
    if (48 <= j && j <= 63) return 0x8f1bbcdc;
    if (64 <= j && j <= 79) return 0xa953fd4e;
    return "rmd160_K1: j out of range";
}

function rmd160_K2(j) {
    if (0 <= j && j <= 15) return 0x50a28be6;
    if (16 <= j && j <= 31) return 0x5c4dd124;
    if (32 <= j && j <= 47) return 0x6d703ef3;
    if (48 <= j && j <= 63) return 0x7a6d76e9;
    if (64 <= j && j <= 79) return 0x00000000;
    return "rmd160_K2: j out of range";
}

var rmd160_r1 = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
    3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
    1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
    4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
];

var rmd160_r2 = [
    5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
    6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
    15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
    8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
    12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
];

var rmd160_s1 = [
    11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
    7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
    11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
    11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
    9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
];

var rmd160_s2 = [
    8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
    9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
    9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
    15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
    8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
];


function safe_add(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
}

function bit_rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
}