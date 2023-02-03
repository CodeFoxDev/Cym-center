"strict mode"
class Mat4 {
	static create() {
		const ret = new Float32Array(16);
		ret[0] = 1;
		ret[5] = 1;
		ret[10] = 1;
		ret[15] = 1;
		return ret;
	}

	static set(out, v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15) {
		out[0] = v0;
		out[1] = v1;
		out[2] = v2;
		out[3] = v3;
		out[4] = v4;
		out[5] = v5;
		out[6] = v6;
		out[7] = v7;
		out[8] = v8;
		out[9] = v9;
		out[10] = v10;
		out[11] = v11;
		out[12] = v12;
		out[13] = v13;
		out[14] = v14;
		out[15] = v15;
		return out;
	}
	
	static identity(out) {
		Mat4.set(
			out, 
			1, 0, 0, 0, 
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		);
		return out;
	}
	
	static perspective(out, fov, aspect, n, f) {
		const S = 1/(Math.tan(fov/2)*aspect);
		Mat4.set(out,
			S, 0, 		 0,             0,
			0, S*aspect, 0, 			0,
			0, 0,        -(f+n)/(f-n), -1,
			0, 0, 		 -2*f*n/(f-n),  0
		);

		return out;
	}
	
	static transpose(out, m) {
		this.set(out,
			m[0], m[4], m[8], m[12],
			m[1], m[5], m[9], m[13],
			m[2], m[6], m[10], m[14],
			m[3], m[7], m[11], m[15]
		);
		return out;
	}

	static mult(out, m2, m1) {
		const ni = Vec4.mult(m2, [m1[0], m1[4], m1[8 ], m1[12]]);
		const nj = Vec4.mult(m2, [m1[1], m1[5], m1[9 ], m1[13]]);
		const nk = Vec4.mult(m2, [m1[2], m1[6], m1[10], m1[14]]);
		const nl = Vec4.mult(m2, [m1[3], m1[7], m1[11], m1[15]]);
		Mat4.set(out,
			ni[0], nj[0], nk[0], nl[0],
			ni[1], nj[1], nk[1], nl[1],
			ni[2], nj[2], nk[2], nl[2],
			ni[3], nj[3], nk[3], nl[3]
		);
		return out;
	}
	static mult4(out, m1, m2, m3, m4) {
		const nm1 = Mat4.mult(Mat4.create(), m1, m2);
		const nm2 = Mat4.mult(Mat4.create(), m3, m4);
		Mat4.mult(out, nm1, nm2);
		return out;
	}
	
	static fpsCamera(out, translation, rotation) {
		const xRot = Mat4.rotationX(Mat4.create(), -rotation[0]);
		const yRot = Mat4.rotationY(Mat4.create(), -rotation[1]);
		const zRot = Mat4.rotationZ(Mat4.create(), -rotation[2]);
		const translate = Mat4.translation(Mat4.create(), -translation[0], -translation[1], -translation[2]);
		
		Mat4.mult4(out, translate, yRot, xRot, zRot);
		//zRot, xRot, yRot, translate
		return out;
	}
	static modelMatrix(out, translation, rotation) {
		const xRot = Mat4.rotationX(Mat4.create(), rotation[0]);
		const yRot = Mat4.rotationY(Mat4.create(), rotation[1]);
		const zRot = Mat4.rotationZ(Mat4.create(), rotation[2]);
		const translate = Mat4.translation(Mat4.create(), translation[0], translation[1], translation[2]);

		Mat4.mult4(out, translate, zRot, xRot, yRot);
		return out;
	}
	
	static translation(out, x, y, z) {
		Mat4.set(out, 
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			x, y, z, 1
		);
		return out;
	}
	
	static rotationX(out, a) {
		const s = Math.sin(a);
		const c = Math.cos(a);
		
		Mat4.set(out, 
			1, 0, 0, 0,
			0, c,-s, 0,
			0, s, c, 0,
			0, 0, 0, 1
		);
		return out;
	}
	static rotationY(out, a) {
		const s = Math.sin(a);
		const c = Math.cos(a);
		
		Mat4.set(out, 
			c, 0,-s, 0,
			0, 1, 0, 0,
			s, 0, c, 0,
			0, 0, 0, 1
		);
		return out;
	}
	static rotationZ(out, a) {
		const s = Math.sin(a);
		const c = Math.cos(a);
		
		Mat4.set(out, 
			c,-s, 0, 0,
			s, c, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		);
		return out;
	}
}