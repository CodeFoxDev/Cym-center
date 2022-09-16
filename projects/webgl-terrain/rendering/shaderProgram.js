"use strict"
class ShaderProgramClass {
    constructor(vsCode, fsCode, transformFeedBack) {
      const vertexShader = ShaderProgramClass.loadShader(gl.VERTEX_SHADER, vsCode);
      const fragmentShader = ShaderProgramClass.loadShader(gl.FRAGMENT_SHADER, fsCode);
  
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      if(transformFeedBack != false) {
        gl.transformFeedbackVaryings(
          this.program,
          transformFeedBack,
          gl.SEPARATE_ATTRIBS
        );
      }
      gl.linkProgram(this.program);
  
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(this.program));
        return null;
      }
    }

    static getProgram(vSource, fSource, transformFeedBack = false) {
      const vertexShader = ShaderProgramClass.loadShader(gl.VERTEX_SHADER, vSource);
      const fragmentShader = ShaderProgramClass.loadShader(gl.FRAGMENT_SHADER, fSource);
  
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      if(transformFeedBack != false) {
        gl.transformFeedbackVaryings(
          program,
          transformFeedBack,
          gl.SEPARATE_ATTRIBS
        );
      }
      gl.linkProgram(program);
  
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
      }

      return program;
    }
  
    static loadShader(type, source) {
      const shader = gl.createShader(type);
    
      // Send the source to the shader object
      gl.shaderSource(shader, source);
    
      // Compile the shader program
      gl.compileShader(shader);
    
      // See if it compiled successfully
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
    
      return shader;
    }
  }