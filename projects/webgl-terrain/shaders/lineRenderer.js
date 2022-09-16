"use strict"
let lineRenderer;
function loadLineRenderer() {
    lineRenderer = new Renderer(new ShaderProgramClass(
        //vertex shader
        `#version 300 es
        precision mediump float;

        in vec3 aVertexPosition;
        in vec4 aVertexColor;
        in float aVertexType;
        in vec3 aVertexOtherVertex;

        uniform mat4 uModelMat;
        uniform mat4 uViewMat;
        uniform mat4 uPerspectiveMat;
        
        out highp vec4 vColor;

        void main(void) {
            //between vertexShader and frag position will be divided by w-component
            //maybe wait with multiplying with the perspective matrix?
            vec4 tVertex2 = uViewMat * uModelMat * vec4(aVertexOtherVertex, 1.);
            vec4 tVertex = uViewMat * uModelMat * vec4(aVertexPosition, 1.);
            vec2 tNormal = normalize(tVertex2.xy - tVertex.xy);

            vec4 finalPosition = tVertex + vec4(tNormal.y, -tNormal.x, -.1, 0.)*(aVertexType - .5)*.01;
            finalPosition.w = 1.;
            gl_Position = uPerspectiveMat * finalPosition;

            vColor = aVertexColor;
        }
        `,
        //fragment shader
        `#version 300 es
        precision mediump float;

        in vec4 vColor;
        out vec4 outColor; 

        void main(void) {
            outColor = vColor;
        }
        `,
        false
    ));
    lineRenderer.addAttrib(3, gl.FLOAT, "Position");
    lineRenderer.addAttrib(4, gl.FLOAT, "Color");
    lineRenderer.addAttrib(1, gl.FLOAT, "Type");
    lineRenderer.addAttrib(3, gl.FLOAT, "OtherVertex");

    lineRenderer.addUniformMatrix(Mat4.identity(new Float32Array(16)), "ModelMat");
    lineRenderer.addUniformMatrix(Mat4.identity(new Float32Array(16)), "ViewMat");
    lineRenderer.addUniformMatrix(Mat4.identity(new Float32Array(16)), "PerspectiveMat");
}