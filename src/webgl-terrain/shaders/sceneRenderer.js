"use strict"
let sceneRenderer;
function loadSceneRenderer() {
    sceneRenderer = new Renderer(new ShaderProgramClass(
        //vertex shader
        `#version 300 es
        precision highp float;

        in vec3 aVertexPosition;
        in vec3 aVertexNormal;
        in vec4 aVertexColor;

        uniform mat4 uViewMat;
        uniform mat4 uPerspectiveMat;
        
        out vec4 vColor;
        out vec4 vPos;
        out vec3 noisePos;
        out vec3 normal;
        
        void main(void) {
            noisePos = aVertexPosition.xyz;
            //if(aVertexPosition.y > 310.) {
                vPos = uViewMat * vec4(aVertexPosition, 1.);
                gl_Position = uPerspectiveMat * vPos;
            /*}
            else {
                gl_Position = uPerspectiveMat * uViewMat * vec4(aVertexPosition.x, 310., aVertexPosition.z, 1.);
                //gl_Position = uPerspectiveMat * vec4(vPos.x, 310., vPos.z, vPos.w);
            }*/

            vColor = aVertexColor;
            normal = normalize(aVertexNormal);
        }
        `,
        //fragment shader
        `#version 300 es
        precision highp float;

        in vec4 vColor;
        in vec4 vPos;
        in vec3 noisePos;
        in vec3 normal;
        
        uniform float uRenderDistance;
        uniform vec3 uPlayerPos;

        out vec4 outColor;

        float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}
        
        float noise(vec3 p) {
            vec3 a = floor(p);
            vec3 d = p - a;
            d = d * d * (3.0 - 2.0 * d);
        
            vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
            vec4 k1 = perm(b.xyxy);
            vec4 k2 = perm(k1.xyxy + b.zzww);
        
            vec4 c = k2 + a.zzzz;
            vec4 k3 = perm(c);
            vec4 k4 = perm(c + 1.0);
        
            vec4 o1 = fract(k3 * (1.0 / 41.0));
            vec4 o2 = fract(k4 * (1.0 / 41.0));
        
            vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
            vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);
        
            return o4.y * d.y + o4.x * (1.0 - d.y);
        }

        vec4 sky = vec4(0.5, 0.5, 0.5, 0.8);
        void main(void) {
            float fogDistance = length(vPos.xyz);
            if(fogDistance > uRenderDistance) {
                discard;
            }
            float fogDensity = pow(fogDistance/uRenderDistance, 2.); //-2x^3 + 3x^2

            float normalMult = normalize(normal).y;
            
            float maxWaterHeight = 210.;
            float minWaterHeight = 150.;

            float minSnowStart = 400.;
            float maxSnowStart = 410.;

            float minGrassHeight = -50.;
            float maxGrassHeight = 700.;
            float grassAmount = (noisePos.y - maxGrassHeight) / (minGrassHeight - maxGrassHeight);

            vec4 rockNoise = vec4(pow((noise(noisePos * 4.) + noise(noisePos * 2.)*2. + noise(noisePos)*4.) * .1, 2.)*.5);
            rockNoise.w = 0.;
            vec4 fColor = (vColor + rockNoise)*(normalMult * 0.5 + .5);
            fColor.w = 1.;

            // if(fract(noisePos.x / 32.) < .002 || fract(noisePos.z / 32.) < .002) {
            //     fColor = vec4(1., 0., 0., 1.);
            //     return;
            // }
            if(noisePos.y < maxWaterHeight) {
                //playerY*(1-a) + noisePosY*(a) = waterHeight
                //playerY + a*(noisePosY - playerY) = waterHeight
                //a = (waterHeight - playerY) / (noisePos - playerY)
                float a = (maxWaterHeight - 2. * uPlayerPos.y) / (noisePos.y - 2. * uPlayerPos.y);

                float darkening = exp(-length((1. - a)*(uPlayerPos - noisePos) / 10.));
                
                fColor = (mix(vec4(0., 0., 0., 1.), rockNoise*.2 + vec4(0., 0., 1., 1.), darkening))*normalMult;
                fColor.w = 1.;
            }
            else if(noisePos.y > minSnowStart) {
                float snowAmount = clamp((noisePos.y - minSnowStart) / (maxSnowStart - minSnowStart), 0., 1.);
                fColor = mix(fColor, vec4(0.9, 0.9, 0.9, 1.) * (normalMult * .3 + .7), snowAmount);
                fColor.w = 1.;
            }
            else if(grassAmount * normalMult > 0.4) {
                fColor = mix(fColor, vec4(0.1, .5, 0.1, 1.)*normalMult, clamp((grassAmount*normalMult - .4) * 20., 0., 1.));
                fColor.w = 1.;
            }
            outColor = mix(fColor, sky, fogDensity);
        }
        `,
        false
    ));
    sceneRenderer.addAttrib(3, gl.FLOAT, "Position");
    sceneRenderer.addAttrib(3, gl.FLOAT, "Normal");
    sceneRenderer.addAttrib(4, gl.FLOAT, "Color");

    sceneRenderer.addUniformMatrix(Mat4.identity(new Float32Array(16)), "ViewMat");
    sceneRenderer.addUniformMatrix(Mat4.identity(new Float32Array(16)), "PerspectiveMat");
    sceneRenderer.addUniform(new Float32Array(3), "PlayerPos", "3fv");
    sceneRenderer.addUniform(0, "RenderDistance", "1f");
}