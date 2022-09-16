const GRAVITY = -0.01;
const DT = .1;
const LINE_COLOR = [.4, .4, .4, 1];
const FACE_COLOR = [.6, .6, .6, 1];
const QUAD_INDEX = [0, 1, 2, 2, 3, 0];
const AIR_RESISTANCE = .1;
const WIND = [0, 0, 0];
const STIFFNESS = 0.3;
const SPEED = 1;

class RigidBody {
    constructor() {
        this.nVertices = 0;
        this.vertices = [];
        this.pVertices = [];
        this.vertexForces = [];

        this.nConstraints = 0;
        this.constraintIndices = [];
        this.constraintLengths = [];

        this.nFaces = 0;
        this.faceIndices = [];
        this.faceNormals = [];

        this.buffers = {
            lineVertexBuffer: Renderer.initMeshBuffer([], gl.DYNAMIC_DRAW),
            lineIndexBuffer: Renderer.initIndexBuffer([]),
            lineColorBuffer: Renderer.initMeshBuffer([], gl.STATIC_DRAW),
            lineVertexTypeBuffer: Renderer.initMeshBuffer([], gl.STATIC_DRAW),
            lineOtherVertexBuffer: Renderer.initMeshBuffer([], gl.DYNAMIC_DRAW),
            
            faceVertexBuffer: Renderer.initMeshBuffer([], gl.STATIC_DRAW),
            faceIndexBuffer: Renderer.initIndexBuffer([]),
            faceNormalBuffer: Renderer.initMeshBuffer([], gl.DYNAMIC_DRAW),
            faceColorBuffer: Renderer.initMeshBuffer([], gl.STATIC_DRAW)
        };
        this.lineVao = undefined;
        this.faceVao = undefined;
    }

    initVaos() {
        this.lineVao = lineRenderer.initVao(this.getLineMeshBuffers(), gl.TRIANGLES);
        this.faceVao = sceneRenderer.initVao(this.getFaceMeshBuffers(), gl.TRIANGLES);
    }

    //adding parts of the rigidbody
    addMesh(mesh, scale) {
        const indexOffset = this.vertices.length;
        for(let i = 0; i < mesh.vertices.length; i += 3) {
            this.addVertex(mesh.vertices[i]*scale, mesh.vertices[i+1]*scale, mesh.vertices[i+2]*scale);
        }
        for(let i = 0; i < mesh.indices.length; i += 3) {
            this.addConstraint(mesh.indices[i  ] + indexOffset, mesh.indices[i+1] + indexOffset);
            this.addConstraint(mesh.indices[i+1] + indexOffset, mesh.indices[i+2] + indexOffset);
            this.addConstraint(mesh.indices[i+2] + indexOffset, mesh.indices[i  ] + indexOffset);
            this.addFace(mesh.indices[i], mesh.indices[i+1], mesh.indices[i+2]);
        }
    }
    addVertex(x, y, z) {
        this.nVertices++;
        this.vertices.push(x, y, z);
        this.pVertices.push(x, y, z);
        this.vertexForces.push(0, 0, 0);

        this.buffers.faceVertexBuffer = Renderer.initMeshBuffer(new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
        this.buffers.faceNormalBuffer = Renderer.initMeshBuffer(new Float32Array(this.nVertices*3), gl.DYNAMIC_DRAW);
    }
    addConstraint(i1, i2) {
        for(let i = 0; i < this.nConstraints*2; i += 2) {
            if(this.constraintIndices[i] == i1) {
                if(this.constraintIndices[i+1] == i2) {
                    return;
                }
            }
            if(this.constraintIndices[i+1] == i1) {
                if(this.constraintIndices[i] == i2) {
                    return;
                }
            }
        }
        this.nConstraints++;
        this.constraintIndices.push(i1, i2);
        const length = Math.sqrt(
            (this.vertices[i1*3+0] - this.vertices[i2*3+0])**2 + 
            (this.vertices[i1*3+1] - this.vertices[i2*3+1])**2 + 
            (this.vertices[i1*3+2] - this.vertices[i2*3+2])**2
        );
        this.constraintLengths.push(length);
        
        let lineVertices = new Float32Array(this.nConstraints*3*4); //each constraint has 4 vertices and each vertex has 3 coordinates
        for(let i = 0; i < this.nConstraints*2; i++) {
            lineVertices[i*6  ] = this.vertices[this.constraintIndices[i]*3  ];
            lineVertices[i*6+1] = this.vertices[this.constraintIndices[i]*3+1];
            lineVertices[i*6+2] = this.vertices[this.constraintIndices[i]*3+2];
            lineVertices[i*6+3] = this.vertices[this.constraintIndices[i]*3  ];
            lineVertices[i*6+4] = this.vertices[this.constraintIndices[i]*3+1];
            lineVertices[i*6+5] = this.vertices[this.constraintIndices[i]*3+2];
        }
        this.buffers.lineVertexBuffer = Renderer.initMeshBuffer(lineVertices, gl.DYNAMIC_DRAW);
        this.updateFixedLineBuffers();
    }
    addFace(i1, i2, i3) {
        this.nFaces++;
        this.faceIndices.push(i1, i2, i3);

        this.updateFixedFaceBuffers();
    }

    //removing parts of the rigidbody
    removeFace(i) {
        this.nFaces--;
        this.faceIndices.splice(i*3, 3);

        this.updateFixedFaceBuffers();
    }

    //update all the buffers
    updateFixedLineBuffers() {
        let lineIndices = new Uint16Array(this.nConstraints*6);
        let lineColors = new Float32Array(this.nConstraints*4*4);
        let lineVertexTypes = new Float32Array(this.nConstraints*4);
        let lineOtherVertices = new Float32Array(this.nConstraints*4*3);
        for(let i = 0; i < this.nConstraints; i++) {
            lineIndices[i*6  ] = QUAD_INDEX[0] + i*4;
            lineIndices[i*6+1] = QUAD_INDEX[1] + i*4;
            lineIndices[i*6+2] = QUAD_INDEX[2] + i*4;
            lineIndices[i*6+3] = QUAD_INDEX[3] + i*4;
            lineIndices[i*6+4] = QUAD_INDEX[4] + i*4;
            lineIndices[i*6+5] = QUAD_INDEX[5] + i*4;
        }
        for(let i = 0; i < this.nConstraints*4*4; i++) {
            lineColors[i] = LINE_COLOR[i % 4];
        }
        for(let i = 0; i < this.nConstraints*4; i++) {
            lineVertexTypes[i] = i % 2;
        }
        for(let i = 0; i < this.nConstraints*4*3; i += 12) {
            lineOtherVertices[i  ] = this.vertices[this.constraintIndices[i/12*2+1]*3];
            lineOtherVertices[i+1] = this.vertices[this.constraintIndices[i/12*2+1]*3+1];
            lineOtherVertices[i+2] = this.vertices[this.constraintIndices[i/12*2+1]*3+2];
            lineOtherVertices[i+3] = this.vertices[this.constraintIndices[i/12*2+1]*3];
            lineOtherVertices[i+4] = this.vertices[this.constraintIndices[i/12*2+1]*3+1];
            lineOtherVertices[i+5] = this.vertices[this.constraintIndices[i/12*2+1]*3+2];

            lineOtherVertices[i+6] = this.vertices[this.constraintIndices[i/12*2]*3];
            lineOtherVertices[i+7] = this.vertices[this.constraintIndices[i/12*2]*3+1];
            lineOtherVertices[i+8] = this.vertices[this.constraintIndices[i/12*2]*3+2];
            lineOtherVertices[i+9] = this.vertices[this.constraintIndices[i/12*2]*3];
            lineOtherVertices[i+10]= this.vertices[this.constraintIndices[i/12*2]*3+1];
            lineOtherVertices[i+11]= this.vertices[this.constraintIndices[i/12*2]*3+2];
        }

        this.buffers.lineIndexBuffer = Renderer.initIndexBuffer(lineIndices);
        this.buffers.lineColorBuffer = Renderer.initMeshBuffer(lineColors, gl.STATIC_DRAW);
        this.buffers.lineVertexTypeBuffer = Renderer.initMeshBuffer(lineVertexTypes, gl.STATIC_DRAW);
        this.buffers.lineOtherVertexBuffer = Renderer.initMeshBuffer(lineOtherVertices, gl.DYNAMIC_DRAW);
    }
    updateFixedFaceBuffers() {
        let faceColors = new Float32Array(this.nVertices*4);
        for(let i = 0; i < this.nVertices*4; i++) {
            faceColors[i] = FACE_COLOR[i % 4];
        }
        this.buffers.faceIndexBuffer = Renderer.initIndexBuffer(new Uint16Array(this.faceIndices));
        this.buffers.faceColorBuffer = Renderer.initMeshBuffer(faceColors, gl.STATIC_DRAW);
    }
    updateUnfixedBuffers() {
        let lineVertices = new Float32Array(this.nConstraints*3*4); //each constraint has 4 vertices and each vertex has 3 coordinates
        let lineOtherVertices = new Float32Array(this.nConstraints*3*4);
        for(let i = 0; i < this.nConstraints*2; i++) {
            lineVertices[i*6  ] = this.vertices[this.constraintIndices[i]*3  ];
            lineVertices[i*6+1] = this.vertices[this.constraintIndices[i]*3+1];
            lineVertices[i*6+2] = this.vertices[this.constraintIndices[i]*3+2];
            lineVertices[i*6+3] = this.vertices[this.constraintIndices[i]*3  ];
            lineVertices[i*6+4] = this.vertices[this.constraintIndices[i]*3+1];
            lineVertices[i*6+5] = this.vertices[this.constraintIndices[i]*3+2];
        }
        for(let i = 0; i < this.nConstraints*4*3; i += 12) {
            lineOtherVertices[i  ] = this.vertices[this.constraintIndices[i/12*2+1]*3];
            lineOtherVertices[i+1] = this.vertices[this.constraintIndices[i/12*2+1]*3+1];
            lineOtherVertices[i+2] = this.vertices[this.constraintIndices[i/12*2+1]*3+2];
            lineOtherVertices[i+3] = this.vertices[this.constraintIndices[i/12*2+1]*3];
            lineOtherVertices[i+4] = this.vertices[this.constraintIndices[i/12*2+1]*3+1];
            lineOtherVertices[i+5] = this.vertices[this.constraintIndices[i/12*2+1]*3+2];

            lineOtherVertices[i+6] = this.vertices[this.constraintIndices[i/12*2]*3];
            lineOtherVertices[i+7] = this.vertices[this.constraintIndices[i/12*2]*3+1];
            lineOtherVertices[i+8] = this.vertices[this.constraintIndices[i/12*2]*3+2];
            lineOtherVertices[i+9] = this.vertices[this.constraintIndices[i/12*2]*3];
            lineOtherVertices[i+10]= this.vertices[this.constraintIndices[i/12*2]*3+1];
            lineOtherVertices[i+11]= this.vertices[this.constraintIndices[i/12*2]*3+2];
        }

        Renderer.updateMeshBuffer(this.buffers.lineVertexBuffer, lineVertices);
        Renderer.updateMeshBuffer(this.buffers.lineOtherVertexBuffer, lineOtherVertices);

        Renderer.updateMeshBuffer(this.buffers.faceVertexBuffer, new Float32Array(this.vertices));
        //vertex normal updating needs changing
        Renderer.updateMeshBuffer(this.buffers.faceNormalBuffer, new Float32Array(this.nFaces*3));
    }

    //get the buffers for rendering
    getFaceMeshBuffers() {
        return {
            position: this.buffers.faceVertexBuffer,
            color: this.buffers.faceColorBuffer,
            indices: this.buffers.faceIndexBuffer,
            normal: this.buffers.faceNormalBuffer
        };
    }
    getLineMeshBuffers() {
        return {
            position: this.buffers.lineVertexBuffer,
            color: this.buffers.lineColorBuffer,
            type: this.buffers.lineVertexTypeBuffer,
            othervertex: this.buffers.lineOtherVertexBuffer,
            indices: this.buffers.lineIndexBuffer
        };
    }

    //physics updates
    update() {
        for(let i = 0; i < SPEED/DT; i++) {
            this.vertexForces.fill(0);

            this.addAirResistance();
            this.updatePositions();
            for(let i = 0; i < 10; i++) {
                this.solveConstraints();
            }
            this.fixCollisions();
        }

        this.updateUnfixedBuffers();
    }
    updatePositions() {
        const constForce = [0, GRAVITY, 0];

        let prev;
        for(let i = 0; i < this.nVertices * 3; i++) {
            prev = this.vertices[i];
            this.vertices[i] += prev - this.pVertices[i] + (constForce[i % 3] + this.vertexForces[i])*DT*DT;
            this.pVertices[i] = prev;
        }
    }
    solveConstraints() {
        let vi0, vi1, v0, v1, distance, wDistance, deltaDistance, toV1;
        for(let i = 0; i < this.nConstraints; i++) {
            vi0 = this.constraintIndices[i*2]*3;
            vi1 = this.constraintIndices[i*2+1]*3;
            v0 = [
                this.vertices[vi0],
                this.vertices[vi0+1],
                this.vertices[vi0+2]
            ];
            v1 = [
                this.vertices[vi1],
                this.vertices[vi1+1],
                this.vertices[vi1+2]
            ];
            distance = Math.sqrt((v0[0]-v1[0])**2 + (v0[1]-v1[1])**2 + (v0[2]-v1[2])**2);
            wDistance = this.constraintLengths[i];
            
            deltaDistance = STIFFNESS * (distance - wDistance)/distance;
            toV1 = [
                v0[0] - v1[0],
                v0[1] - v1[1],
                v0[2] - v1[2]
            ];

            this.vertices[vi0  ] -= toV1[0]*deltaDistance;
            this.vertices[vi0+1] -= toV1[1]*deltaDistance;
            this.vertices[vi0+2] -= toV1[2]*deltaDistance;

            this.vertices[vi1  ] += toV1[0]*deltaDistance;
            this.vertices[vi1+1] += toV1[1]*deltaDistance;
            this.vertices[vi1+2] += toV1[2]*deltaDistance;
        }
    }
    fixCollisions() {
        for(let i = 0; i < this.nVertices * 3; i += 3) {
            this.vertices[i+1] = Math.max(-200, this.vertices[i+1]);
        }
    }
    addAirResistance() {
        for(let i = 0; i < this.nFaces*3; i += 3) {
            let vi0 = this.faceIndices[i  ]*3;
            let vi1 = this.faceIndices[i+1]*3;
            let vi2 = this.faceIndices[i+2]*3;
            let v0 = [
                this.vertices[vi0],
                this.vertices[vi0+1],
                this.vertices[vi0+2]
            ];
            let v1 = [
                this.vertices[vi1],
                this.vertices[vi1+1],
                this.vertices[vi1+2]
            ];
            let v2 = [
                this.vertices[vi2],
                this.vertices[vi2+1],
                this.vertices[vi2+2]
            ];
            let normal = Vec3.findNormal(v0, v1, v2);
            let faceVel = [
                ((v0[0] - this.pVertices[vi0  ]) + (v1[0] - this.pVertices[vi1  ]) + (v2[0] - this.pVertices[vi2  ]))/3 - WIND[0],
                ((v0[1] - this.pVertices[vi0+1]) + (v1[1] - this.pVertices[vi1+1]) + (v2[1] - this.pVertices[vi2+1]))/3 - WIND[1],
                ((v0[2] - this.pVertices[vi0+2]) + (v1[2] - this.pVertices[vi1+2]) + (v2[2] - this.pVertices[vi2+2]))/3 - WIND[2]
            ];
            let airResForceLength = Vec3.dot(normal, faceVel) * AIR_RESISTANCE;
            //x
            this.vertexForces[vi0] -= normal[0]*airResForceLength;
            this.vertexForces[vi1] -= normal[0]*airResForceLength;
            this.vertexForces[vi2] -= normal[0]*airResForceLength;
            //y
            this.vertexForces[vi0+1] -= normal[1]*airResForceLength;
            this.vertexForces[vi1+1] -= normal[1]*airResForceLength;
            this.vertexForces[vi2+1] -= normal[1]*airResForceLength;
            //z
            this.vertexForces[vi0+2] -= normal[2]*airResForceLength;
            this.vertexForces[vi1+2] -= normal[2]*airResForceLength;
            this.vertexForces[vi2+2] -= normal[2]*airResForceLength;
        }
    }
}