let totalTriangles = 0;

class Mesh {
    constructor(vertices, indices, colors, normals) {
		this.vertices = new Float32Array(vertices);
		this.indices = new Uint16Array(indices);
		this.colors = new Float32Array(colors);
		this.normals = new Float32Array(normals);
		totalTriangles += indices.length / 3;

		this.buffers = undefined;
		this.vao = undefined;
	}

	initVao() {
		//this.vao = deferredRenderer.createVao(this);
		this.buffers = Renderer.initMeshBuffers(this);
		this.vao = sceneRenderer.initVao(this.buffers, gl.TRIANGLES);
	}
}