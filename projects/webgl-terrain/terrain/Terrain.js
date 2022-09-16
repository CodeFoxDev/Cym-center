class Terrain {
    constructor(width, height, depth, roughness) {
        this.noise = new PerlinNoise(width, height, depth, roughness);
    }

    getValue(x, y, z) {
        return this.noise.getValue(x, y, z);
    }
}