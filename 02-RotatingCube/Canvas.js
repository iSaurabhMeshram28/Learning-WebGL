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

var is_mouse_pressed = false;

async function main() {
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
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("mouseout", onMouseOut);
  canvas.addEventListener("mousemove", onMouseMove);

  window.addEventListener("resize", resize, false);

  await initialize();
  resize();
  display();
}

function keyDown(event) {
  // code
  switch (event.keyCode) {
    case 65: // A key (move left)
    case 97: // a key (move left)
      MoveCameraLeft(0.5); // Adjust sensitivity as needed
      break;
    case 68: // D key (move right)
    case 100: // d key (move right)
      MoveCameraRight(0.5);
      break;
    case 87: // W key (move forward)
    case 119: // w key (move forward)
      MoveCameraFront(0.5);
      break;
    case 83: // S key (move back)
    case 115: // s key (move back)
      MoveCameraBack(0.5);
      break;
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

function onMouseDown(e) {
  //code
  last_x = e.pageX;
  last_y = e.pageY;
  is_mouse_pressed = true;
}

function onMouseUp() {
  is_mouse_pressed = false;
}

function onMouseOut() {
  is_mouse_pressed = false;
}

function onMouseMove(e) {
  if (is_mouse_pressed) {
    UpdateCameraXY(e.pageX, e.pageY);
  }
}

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

async function loadShaderFile(url) {
  const response = await fetch(url);
  return await response.text();
}

async function initialize() {
  // code
  // get context from canvas
  gl = canvas.getContext("webgl2");
  if (gl == null) {
    console.log("Getting WebGL2 context Failed\n");
  } else {
    console.log("Getting WebGL2 context Succeeded");
  }

  InitializeCamera();

  // set WebGL2 context's viewWidth and viewHeight properties
  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;

  try {
    const vertexShaderSourceCode = await loadShaderFile("vertexShader.glsl");
    const fragmentShaderSourceCode = await loadShaderFile(
      "fragmentShader.glsl"
    );

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
      1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0,
    ]);

    var cubeColor = new Float32Array([
      // front
      1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
      // right
      0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
      // back
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
      // left
      1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.1, 0.0,
      // top
      1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      // bottom
      0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
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
  } catch (error) {
    console.log("Error loading shaders: " + error);
  }
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

  // Draw multiple cubes
  var cubePositions = [
    [0.0, 3.0, -12.0],
    [3.0, 0.0, -8.0],
    [-2.0, 0.0, -4.0],
    [3.0, 4.0, -16.0],
    [0.0, -3.0, -10.0],
    [1.0, 1.0, -20.0],
  ];

  for (let i = 0; i < cubePositions.length; i++) {
    var viewMatrix = GetCameraViewMatrix();
    var translateMatrix = mat4.create();
    var modelMatrix = mat4.create();
    mat4.identity(modelMatrix);
    var mvpMatrix = mat4.create();

    // Cube
    mat4.translate(translateMatrix, translateMatrix, cubePositions[i]);
    mat4.multiply(modelMatrix, modelMatrix, translateMatrix);
    mat4.scale(modelMatrix, modelMatrix, [0.75, 0.75, 0.75]);
    mat4.rotateY(modelMatrix, modelMatrix, glMatrix.toRadian(cangle));
    mat4.rotateX(modelMatrix, modelMatrix, glMatrix.toRadian(cangle));
    mat4.rotateZ(modelMatrix, modelMatrix, glMatrix.toRadian(cangle));
    mat4.multiply(mvpMatrix, perspectiveProjectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
    gl.uniformMatrix4fv(mvpMatrixUniform, false, mvpMatrix);
    gl.bindVertexArray(vao_Cube);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 8, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
    gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);
  }
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
