"use strict";
class Player {
    constructor(position, rotation) {
        this.x = position[0];
        this.y = position[1];
        this.z = position[2];
        this.vel = [0, 0, 0];
        this.rotation = rotation;

		this.renderDistance = undefined;
		this.aspectRatio = undefined;
        
        this.perspectiveMatrix = undefined;
    }

    tryWalk(cx, cz) {

		const forward = [Math.cos(this.rotation[1]), -Math.sin(this.rotation[1])];
		const sideways = [Math.sin(this.rotation[1]), Math.cos(this.rotation[1])];
        const dx = cx*forward[0] + cz*sideways[0];
        const dz = cx*forward[1] + cz*sideways[1];

		this.x += dx;
		this.z += dz;
        /*const newHeight = terrain.castRay([this.x + dx, this.y + 0.1, this.z + dz], [0, -0.01, 0], 200);
        if(newHeight != 0) {
		    this.x += dx;
		    this.y = this.y - newHeight*0.01 + 0.5 + 0.1;
		    this.z += dz;
        }*/
	}

    setPerspectiveMatrix(fov, aspect, near, far) {
		this.renderDistance = far;
		this.aspectRatio = aspect;
        this.perspectiveMatrix = Mat4.perspective(Mat4.create(), fov, aspect, near, far);
    }

    getViewMatrix() {
		this.viewMatrix = Mat4.fpsCamera(Mat4.create(), [this.x, this.y, this.z], this.rotation);
		return this.viewMatrix;
	}

    turn(x, y, z) {
		this.rotation[0] += x;
		this.rotation[1] += y;
		this.rotation[2] += z;
	}
	
	checkKeys(deltaTime) {
		const turnSpeed = deltaTime*0.03;
		const moveSpeed = deltaTime*0.6;
		if(keysPressed.indexOf("i") != -1) {
			this.turn(-turnSpeed, 0, 0);
		}
		if(keysPressed.indexOf("j") != -1) {
			this.turn(0, turnSpeed, 0);
		}
		if(keysPressed.indexOf("k") != -1) {
			this.turn(turnSpeed, 0, 0);
		}
		if(keysPressed.indexOf("l") != -1) {
			this.turn(0, -turnSpeed, 0);
		}
		
		if(keysPressed.indexOf("w") != -1) {
			this.tryWalk(0, -moveSpeed);
		}
		if(keysPressed.indexOf("a") != -1) {
			this.tryWalk(-moveSpeed, 0);
		}
		if(keysPressed.indexOf("s") != -1) {
			this.tryWalk(0, moveSpeed);
		}
		if(keysPressed.indexOf("d") != -1) {
			this.tryWalk(moveSpeed, 0);
		}
		if(keysPressed.indexOf("q") != -1) {
			this.y -= moveSpeed;
		}
        if(keysPressed.indexOf("e") != -1) {
			this.y += moveSpeed;
		}
	}
}

let keysPressed = [];
document.onkeydown = function(e) {
	if(keysPressed.indexOf(e.key) != -1) {
		return;
	}
	keysPressed.push(e.key);
}
document.onkeyup = function(e) {
	keysPressed.splice(keysPressed.indexOf(e.key), 1);
}

function isPressed(key) {
	return keysPressed.indexOf(key) != -1;
}