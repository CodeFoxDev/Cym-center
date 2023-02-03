"use strict";
class Renderer {
    constructor(shader) {
        this.shader = shader;
        this.attribs = {};
        this.attribLocations = [];
        this.attribSizes = [];
        this.attribTypes = [];

        this.uniformMats = {};
        this.uniformMatLocations = [];
        this.uniformMatData = [];

        this.uniforms = {};
        this.uniformLocations = [];
        this.uniformData = [];
        this.uniformTypes = [];
    }

    addAttrib(size, type, name) {
        this.attribs[name] = this.attribLocations.length;
        this.attribLocations.push(gl.getAttribLocation(this.shader.program, "aVertex" + name));
        this.attribSizes.push(size);
        this.attribTypes.push(type);
    }
    addUniformMatrix(data, name) {
        this.uniformMats[name] = this.uniformMatData.length;
        this.uniformMatLocations.push(gl.getUniformLocation(this.shader.program, "u" + name));
        this.uniformMatData.push(data);
    }
    addUniform(data, name, type) {
        this.uniforms[name] = this.uniformData.length;
        this.uniformLocations.push(gl.getUniformLocation(this.shader.program, "u" + name));
        this.uniformData.push(data);
        this.uniformTypes.push(type);
    }
    setMatrix(data, name) {
        const index = this.uniformMats[name];
        this.uniformMatData[index] = data;
    }
    setUniform(data, name) {
        const index = this.uniforms[name];
        this.uniformData[index] = data;
    }
    initVao(buffers, mode) {
        let vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        let index, location, size, type;
        for(let name in this.attribs) {
            index = this.attribs[name];
            location = this.attribLocations[index];
            size = this.attribSizes[index];
            type = this.attribTypes[index];

            gl.enableVertexAttribArray(location);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name.toLowerCase()]);
            gl.vertexAttribPointer(location, size, type, false, 0, 0);
        }
        if(mode == gl.TRIANGLES) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
        }

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return vao;
    }

    addTransformFeedback(attributes, bufferSizes, maxPoints) {
        this.transformFeedback = gl.createTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);

        this.outputBuffers = {};
        this.outputSizes = {};
        for(let i in attributes) {
            let buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, bufferSizes[i] * 4 * maxPoints, gl.STATIC_DRAW);
            
            this.outputBuffers[attributes[i]] = buf;
            this.outputSizes[attributes[i]] = bufferSizes[i];

            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, buf);
        }

        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    getTransformFeedback(vao, nPoints) {
        gl.useProgram(this.shader.program);
        gl.bindVertexArray(vao);
        this.setUpUniforms();
        gl.enable(gl.RASTERIZER_DISCARD);

        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, nPoints);
        gl.endTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

        gl.disable(gl.RASTERIZER_DISCARD);
        gl.bindVertexArray(null);

        const allOutputs = {};
        for(let i in this.outputBuffers) {
            const outputs = new Float32Array(nPoints * this.outputSizes[i]);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.outputBuffers[i]);
            gl.getBufferSubData(
                gl.ARRAY_BUFFER, 0, outputs
            );
            allOutputs[i] = outputs;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return allOutputs;
    }

    setUpUniforms() {
        let data, index, location, type;
        for(let name in this.uniformMats) {
            index = this.uniformMats[name];
            location = this.uniformMatLocations[index];
            data = this.uniformMatData[index];
            gl.uniformMatrix4fv(location, false, data);
        }
        for(let name in this.uniforms) {
            index = this.uniforms[name];
            location = this.uniformLocations[index];
            data = this.uniformData[index];
            type = this.uniformTypes[index];

            gl["uniform" + type](location, data);
        }
    }
    render(vao, vertexCount, mode) {
        gl.useProgram(this.shader.program);

        gl.bindVertexArray(vao);
        
        this.setUpUniforms();
        
        if(mode == gl.TRIANGLES || mode == gl.LINES) {
            gl.drawElements(mode, vertexCount, gl.UNSIGNED_SHORT, 0);
        }
        else {
            gl.drawArrays(mode, 0, vertexCount);
        }

        gl.bindVertexArray(null);
    }

    static initMeshBuffers(mesh) {
        const positionBuffer = Renderer.initMeshBuffer(mesh.vertices, gl.STATIC_DRAW);
        const colorBuffer = Renderer.initMeshBuffer(mesh.colors, gl.STATIC_DRAW);
        const normalBuffer = Renderer.initMeshBuffer(mesh.normals, gl.STATIC_DRAW);

        const indexBuffer = Renderer.initIndexBuffer(mesh.indices);

        return {
            position: positionBuffer,
            color: colorBuffer,
            indices: indexBuffer,
            normal: normalBuffer
        };
    }
    static updateIndexBuffer(buffer, indices) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, indices);
    }
    static updateMeshBuffer(buffer, data) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    }
    static initIndexBuffer(indices) {
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        return indexBuffer;
    }
    static initMeshBuffer(data, usage) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, usage);
        return buffer;
    }
}