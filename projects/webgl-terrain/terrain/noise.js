class PerlinNoise {
    constructor(width, height, depth, gradSeparation, startX, startY, startZ) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.gradSeparation = gradSeparation;

        this.startX = 0;
        this.startY = 0;
        this.startZ = 0;
        if(startX !== undefined && startY !== undefined && startZ !== undefined) {
            this.startX = startX;
            this.startY = startY;
            this.startZ = startZ;
        }
 
        this.gWidth = Math.floor(width / gradSeparation) + 1;
        this.gHeight = Math.floor(height / gradSeparation) + 1;
        this.gDepth = Math.floor(depth / gradSeparation) + 1;
        this.gradX = new Float32Array(this.gWidth * this.gHeight * this.gDepth);
        this.gradY = new Float32Array(this.gWidth * this.gHeight * this.gDepth);
        this.gradZ = new Float32Array(this.gWidth * this.gHeight * this.gDepth);
        this.initRandomVectors();
    }

    initRandomVectors() {
        for(let i = 0; i < this.gradX.length; i++) {
            const rand = [Math.random()*2-1, Math.random()*2-1, Math.random()*2-1];
            const invLength = 1/Math.sqrt(rand[0] * rand[0] + rand[1] * rand[1] + rand[2] * rand[2]);
            this.gradX[i] = rand[0] * invLength;
            this.gradY[i] = rand[1] * invLength;
            this.gradZ[i] = rand[2] * invLength;
        }
    }

    lerp(a0, a1, w) {
        //return (a1 - a0) * ((w * (w * 6.0 - 15.0) + 10.0) * w * w * w) + a0; //cubic
        return (a1 - a0) * (3.0 - w * 2.0) * w * w + a0; //quadratic
        //return (a1 - a0) * w + a0; //linear; intruduces weird lines
    }
    gDot(ix, iy, iz, x, y, z) {
        const index = ix + iy*this.gWidth + iz*this.gHeight*this.gWidth;
        const dx = x - ix;
        const dy = y - iy;
        const dz = z - iz;
        return dx * this.gradX[index] + dy * this.gradY[index] + dz * this.gradZ[index];
    }
    getValue(x, y, z) {
        const nx = (x - this.startX) / this.gradSeparation;
        const ny = (y - this.startY) / this.gradSeparation;
        const nz = (z - this.startZ) / this.gradSeparation;

        const x0 = Math.floor(nx);
        const x1 = x0 + 1;
        const y0 = Math.floor(ny);
        const y1 = y0 + 1;
        const z0 = Math.floor(nz);
        const z1 = z0 + 1;

        const sx = nx - x0;
        const sy = ny - y0;
        const sz = nz - z0;


        const n1 = this.lerp(
            this.lerp(this.gDot(x0, y0, z0, nx, ny, nz), this.gDot(x1, y0, z0, nx, ny, nz), sx),
            this.lerp(this.gDot(x0, y1, z0, nx, ny, nz), this.gDot(x1, y1, z0, nx, ny, nz), sx),
            sy
        );

        const n2 = this.lerp(
            this.lerp(this.gDot(x0, y0, z1, nx, ny, nz), this.gDot(x1, y0, z1, nx, ny, nz), sx),
            this.lerp(this.gDot(x0, y1, z1, nx, ny, nz), this.gDot(x1, y1, z1, nx, ny, nz), sx),
            sy
        );

        return this.lerp(n1, n2, sz);
    }
}