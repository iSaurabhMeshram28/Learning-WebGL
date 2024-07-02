var canvas = null;
var gl = null;
var bFullScreen = false;
var canvas_original_width;
var canvas_original_height;
var requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame;

// WebGL related Variables
const VertexAttributeEnum = {
  AMC_ATTRIBUTE_POSITION: 0,
  AMC_ATTRIBUTE_COLOR: 1,
};

var ShaderProgramObject = null;

var vao_Cube = null;
var vbo_CubePosition = null;
var vbo_CubeColor = null;

var mvpMatrixUniform;
var perspectiveProjectionMatrix;

var cangle = 0.0;

// main function
function main() {
  // get Canvas
  canvas = document.getElementById("ssm");
  if (canvas == null) {
    console.log("Getting Canvas Failed\n");
  } else {
    console.log("Getting canvas Succeed");
  }

  // set canvas width and height for future use
  canvas_original_width = canvas.width;
  canvas_original_height = canvas.height;

  // register for keyboard events
  window.addEventListener("keydown", keyDown, false);

  // register for mouse events
  window.addEventListener("click", mouseDown, false);

  window.addEventListener("resize", resize, false);

  initialize();
  resize();
  display();
}

function keyDown(event) {
  // code
  switch (event.keyCode) {
    case 81: // Q key
    case 113: // q key
      uninitialize();
      window.close();
      break;
    case 70: // F key
    case 102: // f key
      toggleFullScreen();
      break;
  }
}

function mouseDown() {}

function toggleFullScreen() {
  var fullScreen_Element =
    document.FullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;

  // if not full screen
  if (fullScreen_Element == null) {
    if (canvas.requestFullscreen) {
      canvas.requestFullscreen();
    } else if (canvas.webkitRequestFullscreen) {
      canvas.webkitRequestFullscreen();
    } else if (canvas.mozRequestFullScreen) {
      canvas.mozRequestFullScreen();
    } else if (canvas.msRequestFullscreen) {
      canvas.msRequestFullscreen();
    }
    bFullScreen = true;
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    bFullScreen = false;
  }
}

function initialize() {
  // code
  // get context from canvas
  gl = canvas.getContext("webgl2");
  if (gl == null) {
    console.log("Getting WebGL2 context Failed\n");
  } else {
    console.log("Getting WebGL2 context Succeeded");
  }

  // set WebGL2 context's viewWidth and viewHeight properties
  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;

  // vertex shader
  var vertexShaderSourceCode =
    `#version 300 es
    in vec4 aPosition;
    in vec4 aColor;
    out vec4 oColor;
    uniform mat4 uMVPMatrix;
    void main() {
      gl_Position = uMVPMatrix * aPosition;
      oColor = aColor;
    }`;

  var vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
  gl.compileShader(vertexShaderObject);

  if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
    var error = gl.getShaderInfoLog(vertexShaderObject);
    console.log("Vertex Shader Compilation error : " + error);
    uninitialize();
  } else {
    console.log("vertex Shader Compiled Successfully");
  }

  var fragmentShaderSourceCode =
    `#version 300 es
    precision highp float;
    in vec4 oColor;
    out vec4 FragColor;
    void main() {
      FragColor = oColor;
    }`;

  var fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
  gl.compileShader(fragmentShaderObject);

  if (!gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS)) {
    var error = gl.getShaderInfoLog(fragmentShaderObject);
    console.log("Fragment Shader Compilation error : " + error);
    uninitialize();
  } else {
    console.log("Fragment Shader Compiled Successfully");
  }

  // Shader Program
  ShaderProgramObject = gl.createProgram();
  gl.attachShader(ShaderProgramObject, vertexShaderObject);
  gl.attachShader(ShaderProgramObject, fragmentShaderObject);
  gl.bindAttribLocation(
    ShaderProgramObject,
    VertexAttributeEnum.AMC_ATTRIBUTE_POSITION,
    "aPosition"
  );
  gl.bindAttribLocation(
    ShaderProgramObject,
    VertexAttributeEnum.AMC_ATTRIBUTE_COLOR,
    "aColor"
  );
  gl.linkProgram(ShaderProgramObject);

  if (!gl.getProgramParameter(ShaderProgramObject, gl.LINK_STATUS)) {
    var error = gl.getProgramInfoLog(ShaderProgramObject);
    console.log("Shader Linking error : " + error);
    uninitialize();
  } else {
    console.log("Shader Linked Successfully");
  }

  mvpMatrixUniform = gl.getUniformLocation(ShaderProgramObject, "uMVPMatrix");

  // Geometry attribute
  var cubePosition = new Float32Array([
    // front
    1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,
    // right
    1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0,
    // back
    1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0,
    // left
    -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,
    // top
    1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
    // bottom
    1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0
  ]);

  var cubeColor = new Float32Array([
    // front
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // right
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // back
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // left
    1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
    // top
    1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // bottom
    0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0
  ]);

  // VAO for Cube
  vao_Cube = gl.createVertexArray();
  gl.bindVertexArray(vao_Cube);

  // VBO for Cube Position
  vbo_CubePosition = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_CubePosition);
  gl.bufferData(gl.ARRAY_BUFFER, cubePosition, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    VertexAttributeEnum.AMC_ATTRIBUTE_POSITION,
    3,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.enableVertexAttribArray(VertexAttributeEnum.AMC_ATTRIBUTE_POSITION);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // VBO for Cube Color
  vbo_CubeColor = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_CubeColor);
  gl.bufferData(gl.ARRAY_BUFFER, cubeColor, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    VertexAttributeEnum.AMC_ATTRIBUTE_COLOR,
    3,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.enableVertexAttribArray(VertexAttributeEnum.AMC_ATTRIBUTE_COLOR);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.bindVertexArray(null); 

  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  perspectiveProjectionMatrix = mat4.create();
}

function resize() {

  if (canvas.height == 0) canvas.height = 1;

  if (bFullScreen == true) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    canvas.width = canvas_original_width;
    canvas.height = canvas_original_height;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);

  mat4.perspective(
    perspectiveProjectionMatrix,
    45.0,
    parseFloat(canvas.width) / parseFloat(canvas.height),
    0.1,
    100.0
  );
}

function display() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(ShaderProgramObject);

  var modelViewMatrix = mat4.create();
  var modelViewProjectionMatrix = mat4.create();

  // Cube
  mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
  mat4.scale(modelViewMatrix, modelViewMatrix, [0.75, 0.75, 0.75]);
  mat4.rotateY(modelViewMatrix, modelViewMatrix, glMatrix.toRadian(cangle));
  mat4.rotateX(modelViewMatrix, modelViewMatrix, glMatrix.toRadian(cangle));
  mat4.rotateZ(modelViewMatrix, modelViewMatrix, glMatrix.toRadian(cangle));
  mat4.multiply(
    modelViewProjectionMatrix,
    perspectiveProjectionMatrix,
    modelViewMatrix
  );
  gl.uniformMatrix4fv(mvpMatrixUniform, false, modelViewProjectionMatrix);
  gl.bindVertexArray(vao_Cube);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 8, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);
  gl.bindVertexArray(null);
  
  gl.useProgram(null);

  update();

  requestAnimationFrame(display, canvas);
}

function update() {
  //code
  cangle = cangle - 0.2;

  if (cangle <= 0.0) {
    cangle = cangle + 360.0;
  }
}

function uninitialize() {
  if (vao_Cube) {
    gl.deleteVertexArray(vao_Cube);
    vao_Cube = null;
  }
  if (vbo_CubePosition) {
    gl.deleteBuffer(vbo_CubePosition);
    vbo_CubePosition = null;
  }
  if (vbo_CubeColor) {
    gl.deleteBuffer(vbo_CubeColor);
    vbo_CubeColor = null;
  } 
  if (ShaderProgramObject) {
    gl.useProgram(ShaderProgramObject);
    var shaderObjects = gl.getAttachedShaders(ShaderProgramObject);
    if (shaderObjects && shaderObjects.length > 0) {
      for (let i = 0; i < shaderObjects.length; i++) {
        gl.detachShader(ShaderProgramObject, shaderObjects[i]);
        gl.deleteShader(shaderObjects[i]);
        shaderObjects[i] = null;
      }
    }

    gl.useProgram(null);
    gl.deleteProgram(ShaderProgramObject);
    ShaderProgramObject = null;
  }

}

