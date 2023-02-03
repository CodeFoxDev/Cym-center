"use strict";
class Vec4 {
	static mult(m, inp) {
		const out = [];
		out[0] = m[0 ]*inp[0] + m[1 ]*inp[1] + m[2 ]*inp[2] + m[3 ]*inp[3];
		out[1] = m[4 ]*inp[0] + m[5 ]*inp[1] + m[6 ]*inp[2] + m[7 ]*inp[3];
		out[2] = m[8 ]*inp[0] + m[9 ]*inp[1] + m[10]*inp[2] + m[11]*inp[3];
		out[3] = m[12]*inp[0] + m[13]*inp[1] + m[14]*inp[2] + m[15]*inp[3];
		return out;
	}
}
class Vec3 {
	static normalize(v) {
		const l = 1/Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
		v[0] *= l;
		v[1] *= l;
		v[2] *= l;
		return v;
	}
	
	static dot(v1, v2) {
		return v1[0] * v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
	}

	static cross(v1, v2) {
		const ret = [];
		ret[0] = v1[1]*v2[2] - v1[2]*v2[1];
		ret[1] = v1[2]*v2[0] - v1[0]*v2[2];
		ret[2] = v1[0]*v2[1] - v1[1]*v2[0];
		return ret;
	}

	static findNormal(v1, v2, v3) {
		const d1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
		const d2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
		
		const ret = [];
		ret[0] = d1[1]*d2[2] - d1[2]*d2[1];
		ret[1] = d1[2]*d2[0] - d1[0]*d2[2];
		ret[2] = d1[0]*d2[1] - d1[1]*d2[0];
		return ret;
	}
}