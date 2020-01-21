'use strict';

var KOSTAL = {
	getNonce: function() {
		return KOSTAL.base64.fromBits(KOSTAL.random.randomWords(3));
	},
	hash: {
		sha256: function(t) {
			this.b[0] || this.O(), t ? (this.F = t.F.slice(0), this.A = t.A.slice(0), this.l = t.l) : this.reset();
		},
		hmac: function(t, e) {
			this.W = e = e || KOSTAL.hash.sha256;
			var n, r = [[],[]], i = e.prototype.blockSize / 32;
			for(this.w = [new e, new e], t.length > i && (t = e.hash(t)), n = 0; n < i; n++) {
				r[0][n] = 909522486 ^ t[n];
				r[1][n] = 1549556828 ^ t[n];
			}
			this.w[0].update(r[0]);
			this.w[1].update(r[1]);
			this.R = new e(this.w[0]);
		}
	},
	pbkdf2: function(t, e, n, r, i) {
		n = n || 10000;
		if(0 > r || 0 > n) {
			throw new KOSTAL.exception.invalid('invalid params');
		}
		'string' === typeof t && (t = KOSTAL.utf8String.toBits(t));
		'string' === typeof e && (e = KOSTAL.utf8String.toBits(e));
		t = new (i = i || KOSTAL.hash.hmac)(t);
		var a, s, u, c, l = [], d = KOSTAL.bitArray;
		for(c = 1; 32 * l.length < (r || 1); c++) {
			for(i = a = t.encrypt(d.concat(e, [c])), s = 1; s < n; s++) {
				for(a = t.encrypt(a), u = 0; u < a.length; u++) {
					i[u] ^= a[u];
				}
			}
			l = l.concat(i);
		}
		return r && (l = d.clamp(l, r)), l;
	},
	base64: {
		B: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
		fromBits: function(t, e, n) {
			var r = '', i = 0, a = KOSTAL.base64.B, s = 0, u = KOSTAL.bitArray.bitLength(t);
			for(n && (a = a.substr(0, 62) + '-_'), n = 0; 6 * r.length < u; ) {
				r += a.charAt((s ^ t[n] >>> i) >>> 26);
				6 > i ? (s = t[n] << 6 - i, i += 26, n++) : (s <<= 6, i -= 6);
			}
			for(; 3 & r.length && !e; ) {
				r += '=';
			}
			return r;
		},
		toBits: function(t, e) {
			t = t.replace(/\s|=/g, '');
			var n, r, i = [], a = 0, s = KOSTAL.base64.B, u = 0;
			for(e && (s = s.substr(0, 62) + '-_'), n = 0; n < t.length; n++) {
				if(0 > (r = s.indexOf(t.charAt(n)))) {
					throw new KOSTAL.exception.invalid('no base64 string!');
				}
				26 < a ? (a -= 26, i.push(u ^ r >>> a), u = r << 32 - a) : u ^= r << 32 - (a += 6);
			}
			56 & a && i.push(KOSTAL.bitArray.partial(56 & a, u, 1));
			return i;
		}
	},
	bitArray: {
		bitSlice: function(t, e, n) {
			t = KOSTAL.bitArray.$(t.slice(e / 32), 32 - (31 & e)).slice(1);
			return void 0 === n ? t : KOSTAL.bitArray.clamp(t, n - e);
		},
		extract: function(t, e, n) {
			var r = Math.floor(-e - n & 31);
			return (-32 & (e + n - 1 ^ e) ? t[e / 32 | 0] << 32 - r ^ t[e / 32 + 1 | 0] >>> r : t[e / 32 | 0] >>> r) & (1 << n) - 1;
		},
		concat: function(t, e) {
			if(0 === t.length || 0 === e.length) {
				return t.concat(e);
			}
			var n = t[t.length - 1],
				r = KOSTAL.bitArray.getPartial(n);
			return 32 === r ? t.concat(e) : KOSTAL.bitArray.$(e, r, 0 | n, t.slice(0, t.length - 1));
		},
		bitLength: function(t) {
			var e = t.length;
			return 0 === e ? 0 : 32 * (e - 1) + KOSTAL.bitArray.getPartial(t[e - 1]);
		},
		clamp: function(t, e) {
			if(32 * t.length < e) {
				return t;
			}
			var n = (t = t.slice(0, Math.ceil(e / 32))).length;
			e &= 31;
			0 < n && e && (t[n - 1] = KOSTAL.bitArray.partial(e, t[n - 1] & 2147483648 >> e - 1, 1));
			return t;
		},
		partial: function(t, e, n) {
			return 32 === t ? e : (n ? 0 | e : e << 32 - t) + 1099511627776 * t;
		},
		getPartial: function(t) {
			return Math.round(t / 1099511627776) || 32;
		},
		equal: function(t, e) {
			if(KOSTAL.bitArray.bitLength(t) !== KOSTAL.bitArray.bitLength(e)) {
				return false;
			}
			var n, r = 0;
			for(n = 0; n < t.length; n++) {
				r |= t[n] ^ e[n];
			}
			return 0 === r;
		},
		$: function(t, e, n, r) {
			var i;
			for(i = 0, void 0 === r && (r = []); 32 <= e; e -= 32) {
				r.push(n);
				n = 0;
			}
			if(0 === e) {
				return r.concat(t);
			}
			for(i = 0; i < t.length; i++) {
				r.push(n | t[i] >>> e);
				n = t[i] << 32 - e;
			}
			i = t.length ? t[t.length - 1] : 0;
			t = KOSTAL.bitArray.getPartial(i);
			r.push(KOSTAL.bitArray.partial(e + t & 31, 32 < e + t ? n : r.pop(), 1));
			return r;
		},
		i: function(t, e) {
			return [
				t[0] ^ e[0],
				t[1] ^ e[1],
				t[2] ^ e[2],
				t[3] ^ e[3]
			];
		},
		byteswapM: function(t) {
			var e, n;
			for(e = 0; e < t.length; ++e) {
				n = t[e];
				t[e] = n >>> 24 | n >>> 8 & 65280 | (65280 & n) << 8 | n << 24;
			}
			return t;
		}
	},
	encrypt: function(l, n) {
		var u = new KOSTAL.cipher.aes(l),
			t = KOSTAL.random.randomWords(4),
			e = KOSTAL.gcm.encrypt(u, KOSTAL.utf8String.toBits(n), t);
		return {
			iv: t,
			tag: KOSTAL.bitArray.bitSlice(e, KOSTAL.bitArray.bitLength(e) - 128),
			ciphertext: KOSTAL.bitArray.clamp(e, KOSTAL.bitArray.bitLength(e) - 128)
		};
	},
	cipher: {
		aes: function(t) {
			this.s[0][0][0] || this.O();
			var e, n, r, i, a = this.s[0][4], s = this.s[1], u = 1;
			if(4 !== (e = t.length) && 6 !== e && 8 !== e) {
				throw new KOSTAL.exception.invalid('invalid aes key size');
			}
			for(this.b = [r = t.slice(0), i = []], t = e; t < 4 * e + 28; t++) {
				n = r[t - 1];
				(0 === t % e || 8 === e && 4 === t % e) && (n = a[n >>> 24] << 24 ^ a[n >> 16 & 255] << 16 ^ a[n >> 8 & 255] << 8 ^ a[255 & n], 0 === t % e && (n = n << 8 ^ n >>> 24 ^ u << 24, u = u << 1 ^ 283 * (u >> 7)));
				r[t] = r[t - e] ^ n;
			}
			for(e = 0; t; e++, t--) {
				n = r[3 & e ? t : t - 4];
				i[e] = 4 >= t || 4 > e ? n : s[0][a[n >>> 24]] ^ s[1][a[n >> 16 & 255]] ^ s[2][a[n >> 8 & 255]] ^ s[3][a[255 & n]];
			}
		}
	},
	gcm: {
		name: 'gcm',
		encrypt: function(t, e, n, r, i) {
			var a = e.slice(0);
			return e = KOSTAL.bitArray,
					r = r || [],
					t = KOSTAL.gcm.C(true, t, a, r, n, i || 128),
					e.concat(t.data, t.tag);
		},
		decrypt: function(t, e, n, r, i) {
			var a = e.slice(0),
				s = KOSTAL.bitArray,
				u = s.bitLength(a);

			i = i || 128;
			r = r || [];
			i <= u ? (e = s.bitSlice(a, u - i), a = s.bitSlice(a, 0, u - i)) : (e = a, a = []);
			t = KOSTAL.gcm.C(false, t, a, r, n, i);
			if(!s.equal(t.tag, e)) {
				throw new KOSTAL.exception.corrupt('unmatchin tag');
			}
			return t.data;
		},
		ka: function(t, e) {
			var n, r, i, a, s, u = KOSTAL.bitArray.i;
			for(i = [0, 0, 0, 0], a = e.slice(0), n = 0; 128 > n; n++) {
				(r = 0 !== (t[Math.floor(n / 32)] & 1 << 31 - n % 32)) && (i = u(i, a));
				s = 0 !== (1 & a[3]);
				for(r = 3; 0 < r; r--) {
					a[r] = a[r] >>> 1 | (1 & a[r - 1]) << 31;
				}
				a[0] >>>= 1, s && (a[0] ^= -520093696);
			}
			return i;
		},
		j: function(t, e, n) {
			var r,
				i = n.length;
			for(e = e.slice(0), r = 0; r < i; r += 4) {
				e[0] ^= 4294967295 & n[r];
				e[1] ^= 4294967295 & n[r + 1];
				e[2] ^= 4294967295 & n[r + 2];
				e[3] ^= 4294967295 & n[r + 3];
				e = KOSTAL.gcm.ka(e, t);
			}
			return e;
		},
		C: function(t, e, n, r, i, a) {
			var s, u, c, l, d, h, f, p, _ = KOSTAL.bitArray;
			for(h = n.length, f = _.bitLength(n), p = _.bitLength(r), u = _.bitLength(i), s = e.encrypt([0, 0, 0, 0]), 96 === u ? (i = i.slice(0), i = _.concat(i, [1])) : (i = KOSTAL.gcm.j(s, [0, 0, 0, 0], i), i = KOSTAL.gcm.j(s, i, [0, 0, Math.floor(u / 4294967296), 4294967295 & u])), u = KOSTAL.gcm.j(s, [0, 0, 0, 0], r), d = i.slice(0), r = u.slice(0), t || (r = KOSTAL.gcm.j(s, u, n)), l = 0; l < h; l += 4) {
				d[3]++;
				c = e.encrypt(d);
				n[l] ^= c[0];
				n[l + 1] ^= c[1];
				n[l + 2] ^= c[2];
				n[l + 3] ^= c[3];
			}
			n = _.clamp(n, f);
			t && (r = KOSTAL.gcm.j(s, u, n));
			t = [
				Math.floor(p / 4294967296),
				4294967295 & p,
				Math.floor(f / 4294967296),
				4294967295 & f
			];
			r = KOSTAL.gcm.j(s, r, t);
			c = e.encrypt(i);
			r[0] ^= c[0];
			r[1] ^= c[1];
			r[2] ^= c[2];
			r[3] ^= c[3];
			return {
				tag: _.bitSlice(r, 0, a),
				data: n
			};
		}
	},
	exception: {
		corrupt: function(t) {
			this.toString = function() {
				return 'CORRUPT: ' + this.message;
			};
			this.message = t;
		},
		invalid: function(t) {
			this.toString = function() {
				return 'INVALID: ' + this.message;
			};
			this.message = t;
		}
	},
	utf8String: {
		fromBits: function(t) {
			var e,
				n,
				r = '',
				i = KOSTAL.bitArray.bitLength(t);
			for(e = 0; e < i / 8; e++) {
				if(0 === (3 & e)) { 
					n = t[e / 4];
				}
				r += String.fromCharCode(n >>> 8 >>> 8 >>> 8);
				n <<= 8;
			}
			return decodeURIComponent(escape(r));
		},
		toBits: function(t) {
			t = unescape(encodeURIComponent(t));
			var e,
				n = [],
				r = 0;
			for(e = 0; e < t.length; e++) {
				r = r << 8 | t.charCodeAt(e);
				if(3 === (3 & e)) { 
					n.push(r); r = 0;
				}
			}
			3 & e && n.push(KOSTAL.bitArray.partial(8 * (3 & e), r));
			return n;
		}
	},
	fa: function(t, e) {
		var n, r, o, i = t.F, a = t.b,
			s = i[0],
			u = i[1],
			c = i[2],
			l = i[3],
			d = i[4],
			h = i[5],
			f = i[6],
			p = i[7];
		for(n = 0; 64 > n; n++) {
			16 > n ? r = e[n] : (r = e[n + 1 & 15], o = e[n + 14 & 15], r = e[15 & n] = (r >>> 7 ^ r >>> 18 ^ r >>> 3 ^ r << 25 ^ r << 14) + (o >>> 17 ^ o >>> 19 ^ o >>> 10 ^ o << 15 ^ o << 13) + e[15 & n] + e[n + 9 & 15] | 0);
			r = r + p + (d >>> 6 ^ d >>> 11 ^ d >>> 25 ^ d << 26 ^ d << 21 ^ d << 7) + (f ^ d & (h ^ f)) + a[n];
			p = f;
			f = h;
			h = d;
			d = l + r | 0;
			l = c;
			c = u;
			s = r + ((u = s) & c ^ l & (u ^ c)) + (u >>> 2 ^ u >>> 13 ^ u >>> 22 ^ u << 30 ^ u << 19 ^ u << 10) | 0;
		}
		i[0] = i[0] + s | 0;
		i[1] = i[1] + u | 0;
		i[2] = i[2] + c | 0;
		i[3] = i[3] + l | 0;
		i[4] = i[4] + d | 0;
		i[5] = i[5] + h | 0;
		i[6] = i[6] + f | 0;
		i[7] = i[7] + p | 0;
	},
	c: function(t) {
		t.b = this.l(t).concat(this.l(t));
		t.L = new KOSTAL.cipher.aes(t.b);
	},
	l: function(t) {
		for(var e = 0; 4 > e && (t.h[e] = t.h[e] + 1 | 0, !t.h[e]); e++)
			;
		return t.L.encrypt(t.h);
	},
	i: function(t, e, n) {
		if(4 !== e.length) {
			throw new this.exception.invalid('invalid aes block size');
		}
		var r = t.b[n],
			i = e[0] ^ r[0],
			a = e[n ? 3 : 1] ^ r[1],
			s = e[2] ^ r[2];

		e = e[n ? 1 : 3] ^ r[3];
		var u, c, l, d, h = r.length / 4 - 2, f = 4, p = [0, 0, 0, 0];
		t = (u = t.s[n]) [0];
		var _ = u[1],
			m = u[2],
			y = u[3],
			v = u[4];
		for(d = 0; d < h; d++) {
			u = t[i >>> 24] ^ _[a >> 16 & 255] ^ m[s >> 8 & 255] ^ y[255 & e] ^ r[f];
			c = t[a >>> 24] ^ _[s >> 16 & 255] ^ m[e >> 8 & 255] ^ y[255 & i] ^ r[f + 1];
			l = t[s >>> 24] ^ _[e >> 16 & 255] ^ m[i >> 8 & 255] ^ y[255 & a] ^ r[f + 2];
			e = t[e >>> 24] ^ _[i >> 16 & 255] ^ m[a >> 8 & 255] ^ y[255 & s] ^ r[f + 3];
			f += 4;
			i = u;
			a = c;
			s = l;
		}
		for(d = 0; 4 > d; d++) {
			p[n ? 3 & -d : d] = v[i >>> 24] << 24 ^ v[a >> 16 & 255] << 16 ^ v[s >> 8 & 255] << 8 ^ v[255 & e] ^ r[f++];
			u = i;
			i = a;
			a = s;
			s = e;
			e = u;
		}
		return p;
	}
};

KOSTAL.hash.hmac.prototype.encrypt = KOSTAL.hash.hmac.prototype.mac = function(t) {
	if(this.aa) {
		throw new KOSTAL.exception.invalid('encrypt on already updated hmac called!');
	}
	this.update(t);
	return this.digest(t);
};

KOSTAL.hash.hmac.prototype.reset = function() {
	this.R = new this.W(this.w[0]);
	this.aa = false;
};

KOSTAL.hash.hmac.prototype.update = function(t) {
	this.aa = true;
	this.R.update(t);
};

KOSTAL.hash.hmac.prototype.digest = function() {
	var t = this.R.finalize();
	t = new this.W(this.w[1]).update(t).finalize();
	this.reset();
	return t;
};

KOSTAL.hash.sha256.hash = function(t) {
	return (new KOSTAL.hash.sha256).update(t).finalize();
};

KOSTAL.hash.sha256.prototype = {
	blockSize: 512,
	reset: function() {
		this.F = this.Y.slice(0);
		this.A = [];
		this.l = 0;
		return this;
	},
	update: function(t) {
		'string' === typeof t && (t = KOSTAL.utf8String.toBits(t));
		var e, n = this.A = KOSTAL.bitArray.concat(this.A, t);
		e = this.l;
		if(9007199254740991 < (t = this.l = e + KOSTAL.bitArray.bitLength(t))) {
			throw new KOSTAL.exception.invalid('Cannot hash more than 2^53 - 1 bits');
		}
		if('undefined' !== typeof Uint32Array) {
			var r = new Uint32Array(n),
				i = 0;
			for(e = 512 + e - (512 + e & 511); e <= t; e += 512) {
				KOSTAL.fa(this, r.subarray(16 * i, 16 * (i + 1)));
				i += 1;
			}
			n.splice(0, 16 * i);
		} else {
			for(e = 512 + e - (512 + e & 511); e <= t; e += 512) {
				KOSTAL.fa(this, n.splice(0, 16));
			}
		}
		return this;
	},
	finalize: function() {
		var t,
			e = this.A,
			n = this.F;
		for(t = (e = KOSTAL.bitArray.concat(e, [KOSTAL.bitArray.partial(1, 1)])).length + 2; 15 & t; t++) {
			e.push(0);
		}
		for(e.push(Math.floor(this.l / 4294967296)), e.push(0 | this.l); e.length; ) {
			KOSTAL.fa(this, e.splice(0, 16));
		}
		this.reset();
		return n;
	},
	Y: [],
	b: [],
	O: function() {
		function t(t) {
			return 4294967296 * (t - Math.floor(t)) | 0;
		}
		for(var e, n, r = 0, o = 2; 64 > r; o++) {
			for(n = true, e = 2; e * e <= o; e++) {
				if(0 === o % e) {
					n = false;
					break;
				}
			}
			n && (8 > r && (this.Y[r] = t(Math.pow(o, 0.5))), this.b[r] = t(Math.pow(o, 1 / 3)), r++);
		}
	}
};

KOSTAL.random = {
	c: [new KOSTAL.hash.sha256],
	m: [0],
	P: 0,
	H: {},
	N: 0,
	U: {},
	Z: 0,
	f: 0,
	o: 0,
	ha: 0,
	b: [0, 0, 0, 0, 0, 0, 0, 0],
	h: [0, 0, 0, 0],
	L: void 0,
	M: 6,
	D: false,
	K: {
		progress: {},
		seeded: {}
	},
	u: 0,
	ga: 0,
	I: 1,
	J: 2,
	ca: 65536,
	T: [0, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024],
	da: 30000,
	ba: 80,
	randomWords: function(t, e) {
		var n, r = [], i = [], a, s = 0;
		for(this.Z = r[0] = (new Date).valueOf() + this.da, a = 0; 16 > a; a++) {
			r.push(4294967296 * Math.random() | 0);
		}
		for(a = 0; a < this.c.length && (r = r.concat(this.c[a].finalize()), s += this.m[a], this.m[a] = 0, n || !(this.P & 1 << a)); a++)
			;
		for(this.P >= 1 << this.c.length && (this.c.push(new KOSTAL.hash.sha256), this.m.push(0)), this.f -= s, s > this.o && (this.o = s), this.P++, this.b = KOSTAL.hash.sha256.hash(this.b.concat(r)), this.L = new KOSTAL.cipher.aes(this.b), n = 0; 4 > n && (this.h[n] = this.h[n] + 1 | 0, !this.h[n]); n++)
			;

		for(n = 0; n < t; n += 4) {
			if(0 === (n + 1) % this.ca) {
				KOSTAL.c(this);
			}
			r = KOSTAL.l(this);
			i.push(r[0], r[1], r[2], r[3]);
		}
		KOSTAL.c(this);
		return i.slice(0, t);
	}
};

KOSTAL.cipher.aes.prototype = {
	encrypt: function(t) {
		return KOSTAL.i(this, t, 0);
	},
	decrypt: function(t) {
		return KOSTAL.i(this, t, 1);
	},
	s: [[[], [], [], [], []], [[], [], [], [], []]],
	O: function() {
		var t, e, n, r, o, i, a, s = this.s[0], u = this.s[1], c = s[4], l = u[4], d = [], h = [];
		for(t = 0; 256 > t; t++) {
			h[(d[t] = t << 1 ^ 283 * (t >> 7)) ^ t] = t;
		}
		for(e = n = 0; !c[e]; e ^= r || 1, n = h[n] || 1) {
			for(i = (i = n ^ n << 1 ^ n << 2 ^ n << 3 ^ n << 4) >> 8 ^ 255 & i ^ 99, c[e] = i, l[i] = e, a = 16843009 * (o = d[t = d[r = d[e]]]) ^ 65537 * t ^ 257 * r ^ 16843008 * e, o = 257 * d[i] ^ 16843008 * i, t = 0; 4 > t; t++) {
				s[t][e] = o = o << 24 ^ o >>> 8;
				u[t][i] = a = a << 24 ^ a >>> 8;
			}
		}
		for(t = 0; 5 > t; t++) {
			s[t] = s[t].slice(0);
			u[t] = u[t].slice(0);
		}
	}
};

module.exports = {
	KOSTAL: KOSTAL
};