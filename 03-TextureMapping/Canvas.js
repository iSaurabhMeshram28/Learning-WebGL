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
  AMC_ATTRIBUTE_TEXTURE: 1,
};

var ShaderProgramObject = null;

var vao_Cube = null;
var vbo_CubePosition = null;
var vbo_Texcoord = null;
var texture_Wood = null;

var mvpMatrixUniform;
var textureSamplerUniform;
var perspectiveProjectionMatrix;

var cangle = 0.0;

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
  window.addEventListener("click", mouseDown, false);

  window.addEventListener("resize", resize, false);

  await initialize();
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
      VertexAttributeEnum.AMC_ATTRIBUTE_TEXTURE,
      "aTexcoord"
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
    textureSamplerUniform = gl.getUniformLocation(
      ShaderProgramObject,
      "uTextureSampler"
    );

    // Geometry attribute setup
  var cubePosition = new Float32Array([
    // front
    1.0,  1.0,  1.0,  // top-right of front
    -1.0, 1.0,  1.0,  // top-left of front
    -1.0, -1.0, 1.0,  // bottom-left of front
    1.0,  -1.0, 1.0,  // bottom-right of front
    // right
    1.0,  1.0,  -1.0, // top-right of right
    1.0,  1.0,  1.0,  // top-left of right
    1.0,  -1.0, 1.0,  // bottom-left of right
    1.0,  -1.0, -1.0, // bottom-right of right
    // back
    1.0,  1.0,  -1.0, // top-right of back
    -1.0, 1.0,  -1.0, // top-left of back
    -1.0, -1.0, -1.0, // bottom-left of back
    1.0,  -1.0, -1.0, // bottom-right of back
    // left
    -1.0, 1.0,  1.0,  // top-right of left
    -1.0, 1.0,  -1.0, // top-left of left
    -1.0, -1.0, -1.0, // bottom-left of left
    -1.0, -1.0, 1.0,  // bottom-right of left
    // top
    1.0,  1.0,  -1.0, // top-right of top
    -1.0, 1.0,  -1.0, // top-left of top
    -1.0, 1.0,  1.0,  // bottom-left of top
    1.0,  1.0,  1.0,  // bottom-right of top
    // bottom
    1.0,  -1.0, 1.0,  // top-right of bottom
    -1.0, -1.0, 1.0,  // top-left of bottom
    -1.0, -1.0, -1.0, // bottom-left of bottom
    1.0,  -1.0, -1.0  // bottom-right of bottom
  ]);

  var cubeTexcoord = new Float32Array([
    // front
    1.0, 1.0, // top-right of front
    0.0, 1.0, // top-left of front
    0.0, 0.0, // bottom-left of front
    1.0, 0.0, // bottom-right of front
    // right
    1.0, 1.0, // top-right of right
    0.0, 1.0, // top-left of right
    0.0, 0.0, // bottom-left of right
    1.0, 0.0, // bottom-right of right
    // back
    1.0, 1.0, // top-right of back
    0.0, 1.0, // top-left of back
    0.0, 0.0, // bottom-left of back
    1.0, 0.0, // bottom-right of back
    // left
    1.0, 1.0, // top-right of left
    0.0, 1.0, // top-left of left
    0.0, 0.0, // bottom-left of left
    1.0, 0.0, // bottom-right of left
    // top
    1.0, 1.0, // top-right of top
    0.0, 1.0, // top-left of top
    0.0, 0.0, // bottom-left of top
    1.0, 0.0, // bottom-right of top
    // bottom
    1.0, 1.0, // top-right of bottom
    0.0, 1.0, // top-left of bottom
    0.0, 0.0, // bottom-left of bottom
    1.0, 0.0  // bottom-right of bottom
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

    // vbo_Texcoord
  vbo_Texcoord = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_Texcoord);
  gl.bufferData(gl.ARRAY_BUFFER, cubeTexcoord, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    VertexAttributeEnum.AMC_ATTRIBUTE_TEXTURE,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.enableVertexAttribArray(VertexAttributeEnum.AMC_ATTRIBUTE_TEXTURE);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);

    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    loadGLTexture();
    perspectiveProjectionMatrix = mat4.create();
  } catch (error) {
    console.log("Error loading shaders: " + error);
  }
}

function loadGLTexture() {
  texture_Wood = gl.createTexture();
  texture_Wood.image = new Image();
  texture_Wood.image.src = "WoodenCrate.jpeg";
  texture_Wood.image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture_Wood);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_Wood.image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
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

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture_Wood);
  gl.uniform1i(textureSamplerUniform, 0);
  
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
  if (vbo_Texcoord) {
    gl.deleteBuffer(vbo_Texcoord);
    vbo_Texcoord = null;
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
