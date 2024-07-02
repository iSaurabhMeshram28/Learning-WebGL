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

//WebGL related Variable
const VertexAttributeEnum = {
  AMC_ATTRIBUTE_POSITION: 0,
  AMC_ATTRIBUTE_COLOR: 1
};

var ShaderProgramObject = null;

var vao = null;
var vbo_Position = null;
var vbo_Color = null;

var mvpMatrixUniform;
var perspectiveProjectionMatrix;

// main function
function main() {
  // get Canvas
  canvas = document.getElementById("ssm");
  if (canvas == null) {
    console.log("Getting Canvas Failed\n");
  } else {
    console.log("Getting canvas Succeed");
  }

  //set canvas width and height for future use
  canvas_original_width = canvas.width;
  canvas_original_height = canvas.height;

  //register for keyboard events
  window.addEventListener("keydown", keyDown, false);

  //register for mouse events
  window.addEventListener("click", mouseDown, false);

  window.addEventListener("resize", resize, false);

  initalize();
  resize();
  display();
}

function keyDown(event) {
  //code
  switch (event.keyCode) {
    case 81:
    case 113:
      uninitialize();
      window.close();
      break;
    case 70:
    case 102:
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

  //if not full screen
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

function initalize() {
  //code
  // get context from canvas
  gl = canvas.getContext("webgl2");
  if (gl == null) {
    console.log("Getting WebGL2 context Failed\n");
  } else {
    console.log("Getting WebGL2 context Succeeded");
  }

  //set WebGL2 context's viewWidth and viewHeight properties
  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;

  //vertex shader
  var vertexShaderSourceCode =
    "#version 300 es\n" +
    "in vec4 aPosition;" +
    "in vec4 aColor;" +
    "out vec4 oColor;" +
    "uniform mat4 uMVPMatrix;" +
    "void main()" +
    "{" +
    "gl_Position= uMVPMatrix * aPosition;" +
    "oColor=aColor;" +
    "}";

  var vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
  gl.compileShader(vertexShaderObject);

  if (gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS) == false) {
    var error = gl.getShaderInfoLog(vertexShaderObject);
    if (error.length > 0) {
      var log = "Vertex Shader Compilation error : " + error;
      console.log(log);
      uninitialize();
    }
  } else {
    console.log("vertex Shader Compiled Successfully");
  }

  var fragmentShaderSourceCode =
    "#version 300 es\n" +
    "precision highp float;" +
    "in vec4 oColor;" +
    "out vec4 FragColor;" +
    "void main()" +
    "{" +
    "FragColor=oColor;" +
    "}";

  var fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
  gl.compileShader(fragmentShaderObject);

  if (gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS) == false) {
    var error = gl.getShaderInfoLog(fragmentShaderObject);
    if (error.length > 0) {
      var log = "Fragment Shader Compilation error : " + error;
      console.log(log);
      uninitialize();
    }
  } else {
    console.log("Fragment Shader Compiled Successfully");
  }

  //Shader Program
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

  if (gl.getProgramParameter(ShaderProgramObject, gl.LINK_STATUS) == false) {
    var error = gl.getProgramInfoLog(ShaderProgramObject);
    if (error.length > 0) {
      var log = "Shader Linking error : " + error;
      console.log(log);
      uninitialize();
    }
  } else {
    console.log(" Shader Linking Successful");
  }

  mvpMatrixUniform = gl.getUniformLocation(ShaderProgramObject, "uMVPMatrix");

  //Geometry attribute
  var trianglePosition = new Float32Array([
    0.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0,
  ]);

  var triangleColor = new Float32Array([
    1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0
  ]);

  //VAO
  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  //vbo_Position
  vbo_Position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_Position);
  gl.bufferData(gl.ARRAY_BUFFER, trianglePosition, gl.STATIC_DRAW);
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

  //vbo_Color
  vbo_Color = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_Color);
  gl.bufferData(gl.ARRAY_BUFFER, triangleColor, gl.STATIC_DRAW);
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

  //depth initialization
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  //set clearColor
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  //initialize projection matrix
  perspectiveProjectionMatrix = mat4.create();
}

function resize() {
  //code

  if (canvas.height == 0) canvas.height = 1;

  if (bFullScreen == true) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    canvas.width = canvas_original_width;
    canvas.height = canvas_original_height;
  }

  //set viewport
  gl.viewport(0, 0, canvas.width, canvas.height);

  //set Perpective Projection
  mat4.perspective(
    perspectiveProjectionMatrix,
    45.0,
    parseFloat(canvas.width) / parseFloat(canvas.height),
    0.1,
    100.0
  );
}

function display() {
  //code
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(ShaderProgramObject);

  //transformation
  var modelViewMatrix = mat4.create();
  var modelViewProjectionMatrix = mat4.create();

  mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -3.0]);
  mat4.multiply(
    modelViewProjectionMatrix,
    perspectiveProjectionMatrix,
    modelViewMatrix
  );

  gl.uniformMatrix4fv(mvpMatrixUniform, false, modelViewProjectionMatrix);

  gl.bindVertexArray(vao);

  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindVertexArray(null);

  gl.useProgram(null);

  update();

  //double buffering
  requestAnimationFrame(display, canvas);
}

function update() {
  //code
}

function uninitialize() {
  //code
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

  if (vbo_Position) {
    gl.deleteBuffer(vbo_Position);
    vbo_Position = null;
  }

  if (vao) {
    gl.deleteVertexArray(vao);
    vao = null;
  }
}
