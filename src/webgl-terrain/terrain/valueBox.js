class ChunkBox {
    constructor(startX, startY, startZ, maxRes) {
        this.startX = startX;
        this.startY = startY;
        this.startZ = startZ;
        //176 * 359 / 3375 = 18.721185185185185 loaded chunks in total with current renderDistance
        //53 frames om alle chunks the laden voor player naar volgende chunk verschuift
        this.maxRes = maxRes;
        this.size = maxRes * 2;

        this.chunkResolutions = new ValueBox3d(Int8Array, this.size, this.size, this.size);
        this.initChunkResolutions();

        
    }
    initChunkResolutions() {
        let resX, resY, resZ, res;
        for(let z = -this.maxRes; z < this.maxRes; z++) {
            resZ = 2 ** Math.max(0, Math.floor(Math.log2(z + 0.5)));
            for(let y = -this.maxRes; y < this.maxRes; y++) {
                resY = 2 ** Math.max(0, Math.floor(Math.log2(y + 0.5)));
                for(let x = -this.maxRes; x < this.maxRes; x++) {
                    resX = 2 ** Math.max(0, Math.floor(Math.log2(x + 0.5)));
                    res = Math.max(resX, resY, resZ);

                    this.chunkResolutions.setByPos(x + this.maxRes, y + this.maxRes, z + this.maxRes, res);
                }
            }
        }
    }
}

class ValueBox2d {
    constructor(arrayType, sizeX, sizeY) {
        this.size = sizeX * sizeY;
        this.values = new arrayType(this.size);
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        
        this.corners = [
            this.getIndex(0, 0),
            this.getIndex(1, 0),
            this.getIndex(0, 1),
            this.getIndex(1, 1),
        ];
    }
    getIndex(x, y) {
        return x + y*this.sizeX;
    }
    getValue(x, y) {
        return this.values[this.getIndex(x, y)];
    }
    setValue(x, y, value) {
        const index = this.getIndex(x, y);
        this.values[index] = value;
        return index;
    }
}

class ValueBox3d {
    constructor(arrayType, sizeX, sizeY, sizeZ, startX = 0, startY = 0, startZ = 0) {
        this.arrayType = arrayType;
        this.size = sizeX * sizeY * sizeZ;
        this.values = new arrayType(this.size).fill(-1);
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.sizeZ = sizeZ;
        
        this.startX = startX;
        this.startY = startY;
        this.startZ = startZ;
        
        this.corners = [
            this.getIndex(this.startX+0, this.startY+0, this.startZ+0),
            this.getIndex(this.startX+1, this.startY+0, this.startZ+0),
            this.getIndex(this.startX+0, this.startY+1, this.startZ+0),
            this.getIndex(this.startX+1, this.startY+1, this.startZ+0),
            this.getIndex(this.startX+0, this.startY+0, this.startZ+1),
            this.getIndex(this.startX+1, this.startY+0, this.startZ+1),
            this.getIndex(this.startX+0, this.startY+1, this.startZ+1),
            this.getIndex(this.startX+1, this.startY+1, this.startZ+1)
        ];
    }
    getIndex(x, y, z) {
        return (x-this.startX) + (y-this.startY)*this.sizeX + (z-this.startZ)*this.sizeY*this.sizeX;
    }
    getByPos(x, y, z) {
        return this.values[this.getIndex(x, y, z)];
    }
    setByPos(x, y, z, value) {
        const index = this.getIndex(x, y, z);
        this.values[index] = value;
        return index;
    }
    getByIndex(i) {
        return this.values[i];
    }
    setByIndex(i, value) {
        this.values[i] = value;
        return i;
    }
    getNormal(x, y, z, res) {
        const index = this.getIndex(x, y, z);
        const nx = this.getByIndex(index - this.corners[1]*res) - this.getByIndex(index + this.corners[1]*res);
        const ny = this.getByIndex(index - this.corners[2]*res) - this.getByIndex(index + this.corners[2]*res);
        const nz = this.getByIndex(index - this.corners[4]*res) - this.getByIndex(index + this.corners[4]*res);
        return [nx, ny, nz];
    }
    fill(n) {
        this.values.fill(n);
    }
    shiftBox(dx, dy, dz) {
        this.shiftValues(-dx, -dy, -dz);
        this.startX += dx;
        this.startY += dy;
        this.startZ += dz;
    }
    shiftValues(dx, dy, dz) {
        const di = dx + dy*this.sizeX + dz*this.sizeY*this.sizeX;
        if(di == 0) {
            return;
        }

        const newValues = new this.arrayType(this.size).fill(-1);
        
        const xStart = dx < 0 ? 0 : this.sizeX - 1;
        const yStart = dy < 0 ? 0 : this.sizeY - 1;
        const zStart = dz < 0 ? 0 : this.sizeZ - 1;

        const xEnd = dx < 0 ? this.sizeX + dx : dx - 1;
        const yEnd = dy < 0 ? this.sizeY + dy : dy - 1;
        const zEnd = dz < 0 ? this.sizeZ + dz : dz - 1;

        const xChange = dx < 0 ? 1 : -1;
        const yChange = dy < 0 ? 1 : -1;
        const zChange = dz < 0 ? 1 : -1;

        for(let z = zStart; z != zEnd; z += zChange) {
            for(let y = yStart; y != yEnd; y += yChange) {
                for(let x = xStart; x != xEnd; x += xChange) {
                    const index = x + y*this.sizeX + z*this.sizeY*this.sizeX;
                    newValues[index] = this.values[index - di];
                }
            }
        }

        this.values = newValues;
        return this.values;
    }
}

class ValueBox4d {
    constructor(arrayType, sizeX, sizeY, sizeZ, sizeW) {
        this.size = sizeX * sizeY * sizeZ * sizeW;
        this.values = new arrayType(this.size);
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.sizeZ = sizeZ;
        this.sizeW = sizeW;

        this.corners = [
            this.getIndex(0, 0, 0, 0),
            this.getIndex(1, 0, 0, 0),
            this.getIndex(0, 1, 0, 0),
            this.getIndex(1, 1, 0, 0),
            this.getIndex(0, 0, 1, 0),
            this.getIndex(1, 0, 1, 0),
            this.getIndex(0, 1, 1, 0),
            this.getIndex(1, 1, 1, 0),
            this.getIndex(0, 0, 0, 1),
            this.getIndex(1, 0, 0, 1),
            this.getIndex(0, 1, 0, 1),
            this.getIndex(1, 1, 0, 1),
            this.getIndex(0, 0, 1, 1),
            this.getIndex(1, 0, 1, 1),
            this.getIndex(0, 1, 1, 1),
            this.getIndex(1, 1, 1, 1)
        ];
    }
    getIndex(x, y, z, w) {
        return x + y*this.sizeX + z*this.sizeY*this.sizeX + w*this.sizeZ*this.sizeY*this.sizeX;
    }
    getValue(x, y, z, w) {
        return this.values[this.getIndex(x, y, z, w)];
    }
    setValue(x, y, z, w, value) {
        const index = this.getIndex(x, y, z, w);
        this.values[index] = value;
        return index;
    }
}