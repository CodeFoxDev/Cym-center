"use strict"
//https://webgl2fundamentals.org/webgl/lessons/webgl-instanced-drawing.html

//https://github.com/Germanunkol/MarchingCubesComputeShader

//http://academy.cba.mit.edu/classes/scanning_printing/MarchingCubes.pdf
//https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu

let gl;
let width, height;
let player;

const infoDiv = document.getElementById("textDisplay");

let chunkManager;

const RENDER_DISTANCE = 32+64+128;

window.onload = function main() {
    const canvas = document.getElementById("canvas");
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl = canvas.getContext("webgl2");

    loadSceneRenderer();
    loadLineRenderer();
    loadTerrainLoader();
    //loadDeferredRenderer();

    player = new Player([0, 500, 0], [Math.PI/6, -Math.PI*0.75, 0]);
    player.setPerspectiveMatrix(Math.PI * 90 / 360, canvas.width / canvas.height, 0.1, RENDER_DISTANCE);

    //terrain = new PerlinNoise(512+33, 512+33, 512+33, 4, -16, -16, -16);
    chunkManager = new ChunkManager();
    
    let fps, previousTime;
    let times = [];
    const fpsDiv = document.getElementById("textDisplay");

    function mainLoop() {
        const currentTime = Date.now();
        drawScene(currentTime - previousTime);
        previousTime = currentTime;

        requestAnimationFrame(() => {
            const now = performance.now();
            while (times.length > 0 && times[0] <= now - 1000) {
                times.shift();
            }
            times.push(now);
            fps = times.length;
            fpsDiv.innerText = "fps: " + fps + "\n" + "unloaded chunks: " + chunkManager.chunkValueLoadStack.length + "\n";
            mainLoop();
        });
    }
    mainLoop();
}

function drawScene(deltaTime) {
    gl.clearColor(0.5, 0.5, 0.5, 0.8);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    player.checkKeys(deltaTime*60/1000);
    player.getViewMatrix();

    sceneRenderer.setMatrix(player.perspectiveMatrix, "PerspectiveMat");
    sceneRenderer.setMatrix(player.viewMatrix, "ViewMat");
    sceneRenderer.setUniform(RENDER_DISTANCE, "RenderDistance");
    sceneRenderer.setUniform([player.x, player.y, player.z], "PlayerPos");
    
    //deferredRenderer.setMatrices(player.viewMatrix, player.perspectiveMatrix);

    chunkManager.updateVisibleChunks(player);
    chunkManager.renderVisibleChunks();
    chunkManager.loadChunks(1);

    infoDiv.innerText += Math.round(player.y);
    //infoDiv.innerText += "x: " + Math.round(player.x * 10)/10 + "\ny:" + Math.round(player.y * 10)/10 + "\n z:" + Math.round(player.z * 10)/10 + "\n";
}