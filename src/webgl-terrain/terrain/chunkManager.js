"strict mode";
const CHUNK_SIZE = {x: 32, y: 32, z: 32}; //also change other things

let undefinedChunks = 0;
class ChunkManager {
    constructor() {
        const boxSize = [
            Math.ceil(2 * RENDER_DISTANCE / CHUNK_SIZE.x) + 1,
            Math.ceil(2 * RENDER_DISTANCE / CHUNK_SIZE.y) + 1,
            Math.ceil(2 * RENDER_DISTANCE / CHUNK_SIZE.z) + 1
        ];
        const boxStart = [
            -Math.ceil(RENDER_DISTANCE / CHUNK_SIZE.x),
            -Math.ceil(RENDER_DISTANCE / CHUNK_SIZE.y),
            -Math.ceil(RENDER_DISTANCE / CHUNK_SIZE.z)
        ];
        //i = -1: chunk is not loaded yet
        //i = -2: empty or full chunk
        //i = -3: full chunk //not available
        //i >= 0: index to loadedMeshes
        this.loadedChunks = new ValueBox3d(
            Int16Array, 
            boxSize[0], boxSize[1], boxSize[2],
            boxStart[0], boxStart[1], boxStart[2]
        );
        this.loadedChunks.fill(-1);
        this.visCorners = new ValueBox3d(
            Array,
            boxSize[0] + 1, boxSize[1] + 1, boxSize[2] + 1,
            boxStart[0], boxStart[1], boxStart[2]
        );
        
        //to load chunks:
        //chunks in fov have priority
        //chunks inside renderdistance will be loaded if computing power is available as to make turning around smoother
        this.nLoadedChunks = 0;
        this.loadedMeshes = [];
        this.loadedChunkPositions = [];
        this.loadedChunkResolutions = [];
        
        this.visibleChunks = [];

        this.chunkValueLoadStack = [];

        this.chunkLoadVaos = [];
        this.initChunkLoadVaos();
    }

    initChunkLoadVaos() {
        terrainLoader.addTransformFeedback(
            ["vDensity"], 
            [1], 
            (CHUNK_SIZE.x+3) * (CHUNK_SIZE.y+3) * (CHUNK_SIZE.z+3)
        );

        const maxRes = Math.min(CHUNK_SIZE.x, CHUNK_SIZE.y, CHUNK_SIZE.z);
        for(let res = 1; res <= maxRes; res *= 2) {
            let vertices = [];
            for(let z = -res; z <= CHUNK_SIZE.z + res; z += res) {
                for(let y = -res; y <= CHUNK_SIZE.y + res; y += res) {
                    for(let x = -res; x <= CHUNK_SIZE.x + res; x += res) {
                        vertices.push(x, y, z);
                    }
                }
            }

            const buffers = {position: Renderer.initMeshBuffer(new Float32Array(vertices), gl.STATIC_DRAW)};
            this.chunkLoadVaos[res] = terrainLoader.initVao(buffers, gl.POINTS);
        }
    }

    renderVisibleChunks() {
        let visibleMeshes = [];
        let modelMatrices = [];
        let chunkMesh;
        for(let i of this.visibleChunks) {
            //visibleMeshes.push(this.loadedMeshes[i]);
            //modelMatrices.push(Mat4.identity(Mat4.create()));
            chunkMesh = this.loadedMeshes[i];
            sceneRenderer.render(chunkMesh.vao, chunkMesh.indices.length, gl.TRIANGLES);
        }

        //deferredRenderer.render(visibleMeshes, modelMatrices);
    }

    loadChunks(max) {
        for(let i = 0; i < max; i++) {
            if(this.chunkValueLoadStack.length == 0) return;
            let c = this.chunkValueLoadStack[0];
            let res = 2;
            
            const chunkIndex = this.loadedChunks.getByPos(c[0], c[1], c[2]);
            if (chunkIndex == undefined) {
                this.chunkValueLoadStack.shift();
                i--;
                undefinedChunks++;
                continue;
            }

            const values = this.loadChunkValues(c[0], c[1], c[2], res);
            if(!this.loadChunk(c[0], c[1], c[2], values, res)) {
                i -= 0.9;
            }

            this.chunkValueLoadStack.shift();
        }
    }

    deleteChunk(index, x, y, z) {
        this.nLoadedChunks--;

        this.loadedChunks.setByPos(x, y, z, -1);
        if(index != this.nLoadedChunks) {
            const replacingChunk = this.nLoadedChunks;
            this.loadedMeshes[index] = this.loadedMeshes[replacingChunk];
            this.loadedChunkPositions[index] = this.loadedChunkPositions[replacingChunk];
            this.loadedChunkResolutions[index] = this.loadedChunkResolutions[replacingChunk];

            const replacePos = this.loadedChunkPositions[replacingChunk];
            this.loadedChunks.setByPos(replacePos[0], replacePos[1], replacePos[2], index);
        }

        this.loadedMeshes.pop();
        this.loadedChunkPositions.pop();
        this.loadedChunkResolutions.pop();
    }

    updateVisibleChunks(player) {
        const playerChunkPos = [
            Math.floor(player.x / CHUNK_SIZE.x) - Math.ceil(RENDER_DISTANCE / CHUNK_SIZE.x),
            Math.floor(player.y / CHUNK_SIZE.y) - Math.ceil(RENDER_DISTANCE / CHUNK_SIZE.y),
            Math.floor(player.z / CHUNK_SIZE.z) - Math.ceil(RENDER_DISTANCE / CHUNK_SIZE.z)
        ];
        if(playerChunkPos[0] != this.loadedChunks.startX || playerChunkPos[1] != this.loadedChunks.startY || playerChunkPos[2] != this.loadedChunks.startZ) {
            this.visCorners.shiftBox(
                playerChunkPos[0] - this.loadedChunks.startX,
                playerChunkPos[1] - this.loadedChunks.startY,
                playerChunkPos[2] - this.loadedChunks.startZ
            );
            this.loadedChunks.shiftBox(
                playerChunkPos[0] - this.loadedChunks.startX,
                playerChunkPos[1] - this.loadedChunks.startY,
                playerChunkPos[2] - this.loadedChunks.startZ
            );
        }
        
        const start = [
            this.loadedChunks.startX,
            this.loadedChunks.startY,
            this.loadedChunks.startZ
        ];
        const end = [
            start[0] + this.loadedChunks.sizeX,
            start[1] + this.loadedChunks.sizeY,
            start[2] + this.loadedChunks.sizeZ
        ];
        for(let i in this.loadedChunkPositions) {
            let pos = this.loadedChunkPositions[i];
            if(pos[0] < start[0] || pos[1] < start[1] || pos[2] < start[2] || pos[0] >= end[0] || pos[1] >= end[1] || pos[2] >= end[2]) {
                this.deleteChunk(i, pos[0], pos[1], pos[2]);   
            }
        }
        
        this.visibleChunks = [];
        this.visCorners.fill(false);
        
        const mat = Mat4.transpose([], Mat4.mult([], player.viewMatrix, player.perspectiveMatrix));

        let cVecX, cVecY, cVecZ, tCornerX, tCornerY, tCornerZ, tCornerW, invW, isInView;
        for(let z = start[2]; z <= end[2]; z++) {
            for(let y = start[1]; y <= end[1]; y++) {
                for(let x = start[0]; x <= end[0]; x++) {
                    cVecX = x*CHUNK_SIZE.x;
                    cVecY = y*CHUNK_SIZE.y;
                    cVecZ = z*CHUNK_SIZE.z;
                    
                    tCornerX = mat[0 ]*cVecX + mat[1 ]*cVecY + mat[2 ]*cVecZ + mat[3 ];
		            tCornerY = mat[4 ]*cVecX + mat[5 ]*cVecY + mat[6 ]*cVecZ + mat[7 ];
		            tCornerZ = mat[8 ]*cVecX + mat[9 ]*cVecY + mat[10]*cVecZ + mat[11];
		            tCornerW = mat[12]*cVecX + mat[13]*cVecY + mat[14]*cVecZ + mat[15];
                    invW = 1/tCornerW;
                    
                    isInView = 
                        (tCornerX*invW <= 1) && (tCornerX*invW >= -1) &&
                        (tCornerY*invW <= 1) && (tCornerY*invW >= -1) &&
                        (tCornerZ*invW <= 1) && (tCornerZ*invW >= -1) &&
                        ((cVecX - player.x)**2 + (cVecY - player.y)**2 + (cVecZ - player.z)**2) < RENDER_DISTANCE * RENDER_DISTANCE;
                    
                    this.visCorners.setByPos(x, y, z, isInView);
                }
            }
        }

        const corners = this.visCorners.corners;
        this.chunkValueLoadStack = [];

        for(let z = start[2]; z < end[2]; z++) {
            for(let y = start[1]; y < end[1]; y++) {
                for(let x = start[0]; x < end[0]; x++) {
                    let cPos = this.visCorners.getIndex(x, y, z);
                    isInView = 
                        this.visCorners.getByIndex(cPos + corners[0]) ||
                        this.visCorners.getByIndex(cPos + corners[1]) ||
                        this.visCorners.getByIndex(cPos + corners[2]) ||
                        this.visCorners.getByIndex(cPos + corners[3]) ||
                        this.visCorners.getByIndex(cPos + corners[4]) ||
                        this.visCorners.getByIndex(cPos + corners[5]) ||
                        this.visCorners.getByIndex(cPos + corners[6]) ||
                        this.visCorners.getByIndex(cPos + corners[7])

                    if(isInView) {
                        const chunkIndex = this.loadedChunks.getByPos(x, y, z);

                        if (chunkIndex == -1) {
                            this.chunkValueLoadStack.push([x, y, z]);
                            continue;
                        }

                        if(chunkIndex >= 0) {
                            this.visibleChunks.push(chunkIndex);
                        }
                    }
                }
            }
        }
    }

    loadChunkValues(chunkX, chunkY, chunkZ, res) {
        const chunkXOffset = chunkX * CHUNK_SIZE.x;
        const chunkYOffset = chunkY * CHUNK_SIZE.y;
        const chunkZOffset = chunkZ * CHUNK_SIZE.z;

        const cWidth = CHUNK_SIZE.x/res + 3;
        const cHeight = CHUNK_SIZE.y/res + 3;
        const cDepth = CHUNK_SIZE.z/res + 3;

        terrainLoader.setUniform([chunkXOffset, chunkYOffset, chunkZOffset], "ChunkOffset");
        
        const valueBox = new ValueBox3d(Float32Array, cWidth, cHeight, cDepth, -1, -1, -1);
        valueBox.values = terrainLoader.getTransformFeedback(this.chunkLoadVaos[res], valueBox.size).vDensity;
        
        return valueBox;
    }

    loadChunk(chunkX, chunkY, chunkZ, valueBox, resolution) {
        let chunkTypes;
        chunkTypes = MarchingCubes.calculateChunkTypes(
            valueBox, 
            CHUNK_SIZE.x/resolution, CHUNK_SIZE.y/resolution, CHUNK_SIZE.z/resolution
        );
        if(chunkTypes == false) {
            this.loadedChunks.setByPos(chunkX, chunkY, chunkZ, -2);
            return false;
        }
        
        const chunkMesh = MarchingCubes.marchChunk(chunkX, chunkY, chunkZ, valueBox, chunkTypes, resolution);
        chunkMesh.initVao();

        const chunkIndex = this.nLoadedChunks;
        this.nLoadedChunks++;
        this.loadedChunks.setByPos(chunkX, chunkY, chunkZ, chunkIndex);

        this.loadedChunkResolutions[chunkIndex] = resolution;
        this.loadedChunkPositions[chunkIndex] = [chunkX, chunkY, chunkZ];
        this.loadedMeshes[chunkIndex] = chunkMesh;
        return true;
    }
}