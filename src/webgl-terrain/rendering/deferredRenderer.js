class DeferredRenderer {
    constructor(gBufferShader, lightingShader) {
        this.gBufferShader = gBufferShader;
        this.lightingShader = lightingShader;

        this.gBuffer = undefined;
        this.initGBuffer();

        this.quadVao = undefined;
        this.initQuadVao();

        this.uNames = [
            "uModel",
            "uView",
            "uProjection"
        ];
        this.uLocations = [
            gl.getUniformLocation(this.gBufferShader, this.uNames[0]),
            gl.getUniformLocation(this.gBufferShader, this.uNames[1]),
            gl.getUniformLocation(this.gBufferShader, this.uNames[2])
        ];
        this.uData = [
            Mat4.identity(Mat4.create()),
            Mat4.identity(Mat4.create()),
            Mat4.identity(Mat4.create())
        ];
    }

    setMatrices(view, projection) {
        this.uData[1] = view;
        this.uData[2] = projection;
    }

    render(meshes, modelMats) {
        this.renderToGBuffer(meshes, modelMats);

        //gl.clearColor(0, 0, 0, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //this.lightingPass();

        /*gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.gBuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

        gl.blitFramebuffer(0, 0, width, height, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);*/
    }
    renderToGBuffer(meshes, modelMats) {
        //gl.clearColor(0, 0, 0, 1);
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.gBufferShader);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);

        //gl.viewport(0, 0, width, height);

        gl.uniformMatrix4fv(this.uLocations[1], false, this.uData[1]);
        gl.uniformMatrix4fv(this.uLocations[2], false, this.uData[2]);

        for(let i = 0; i < meshes.length; i++) {
            gl.uniformMatrix4fv(this.uLocations[0], false, modelMats[i]);

            gl.bindVertexArray(meshes[i].vao);
            gl.drawElements(gl.TRIANGLES, meshes[i].indices.length, gl.UNSIGNED_SHORT, 0);
        }
        gl.bindVertexArray(null);

        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    lightingPass() {
        gl.useProgram(this.lightingShader);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.gPosition);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.gNormal);

        gl.viewport(0, 0, width, height);

        gl.bindVertexArray(this.quadVao);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    createVao(mesh) {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        
        const posLocation = gl.getAttribLocation(this.gBufferShader, "aPos");
        gl.enableVertexAttribArray(posLocation);
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);
        
        const normalLocation = gl.getAttribLocation(this.gBufferShader, "aNormal");
        gl.enableVertexAttribArray(normalLocation);
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        return vao;
    }

    initQuadVao() {
        this.quadVao = gl.createVertexArray();
        gl.bindVertexArray(this.quadVao);

        const posLocation = gl.getAttribLocation(this.lightingShader, "aPos");
        gl.enableVertexAttribArray(posLocation);
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 0, 
            -1, 1, 0, 
            1, -1, 0, 
            1, 1, 0
        ]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 0, 0);
        
        const texCoordLocation = gl.getAttribLocation(this.lightingShader, "aTexCoords");
        gl.enableVertexAttribArray(texCoordLocation);
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0, 0, 
            0, 1, 0, 
            1, 0, 0, 
            1, 1, 0
        ]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(texCoordLocation, 3, gl.FLOAT, false, 0, 0);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
            0, 1, 2, 
            1, 2, 3
        ]), gl.STATIC_DRAW);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    initGBuffer() {
        //https://github.com/tsherif/webgl2examples/blob/master/deferred.html
        this.gBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);

        this.gPosition = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.gPosition);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.gPostion, 0);

        this.gNormal = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.gNormal);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.gNormal, 0);

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1
        ]);

        // const rboDepth = gl.createRenderbuffer();
        // gl.bindRenderbuffer(gl.RENDERBUFFER, rboDepth);
        // gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rboDepth);

        console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}