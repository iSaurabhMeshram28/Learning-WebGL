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

const VertexAttributeEnum = {
  AMC_ATTRIBUTE_POSITION: 0,
  AMC_ATTRIBUTE_NORMAL: 1,
};

var ShaderProgramObject = null;
var perspectiveProjectionMatrix;

var modelViewMatrixUniform;
var projectionMatrixUniform;

var ldUniform;
var kdUniform;
var lightPositionUniform;
var keyPressedUniform;

var bLightingEnabled = false;
var sphere = null;

var lightDiffuse = new Float32Array([1.0, 1.0, 1.0]);
var materialDiffuse = new Float32Array([0.5, 0.5, 0.5]);
var lightPosition = new Float32Array([0.0, 0.0, 2.0, 1.0]);

function main() {
  canvas = document.getElementById("ssm");
  if (canvas == null) {
    console.log("Getting Canvas Failed\n");
    return;
  } else {
    console.log("Getting canvas Succeeded");
  }

  canvas_original_width = canvas.width;
  canvas_original_height = canvas.height;

  window.addEventListener("keydown", keyDown, false);
  window.addEventListener("resize", resize, false);

  initialize();
  resize();
  display();
}

function keyDown(event) {
  switch (event.keyCode) {
    case 81: // 'Q'
    case 113: // 'q'
      uninitialize();
      window.close();
      break;
    case 70: // 'F'
    case 102: // 'f'
      toggleFullScreen();
      break;
    case 76: // 'L'
    case 108: // 'l'
      bLightingEnabled = !bLightingEnabled;
      console.log("Lighting " + (bLightingEnabled ? "Enabled" : "Disabled"));
      break;
  }
}

function toggleFullScreen() {
  var fullScreenElement =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;

  if (fullScreenElement == null) {
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
  gl = canvas.getContext("webgl2");
  if (gl == null) {
    console.log("Getting WebGL2 context Failed\n");
    return;
  } else {
    console.log("Getting WebGL2 context Succeeded");
  }

  sphere = new Mesh();
  makeSphere(sphere, 1.0, 30, 30);
  perspectiveProjectionMatrix = mat4.identity(mat4.create());

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
      console.log("Vertex Shader Compilation Error: " + error);
      uninitialize();
      return;
    } else {
      console.log("Vertex Shader Compiled Successfully");
    }

    var fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
    gl.compileShader(fragmentShaderObject);

    if (!gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS)) {
      var error = gl.getShaderInfoLog(fragmentShaderObject);
      console.log("Fragment Shader Compilation Error: " + error);
      uninitialize();
      return;
    } else {
      console.log("Fragment Shader Compiled Successfully");
    }

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
      VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL,
      "aNormal"
    );
    gl.linkProgram(ShaderProgramObject);

    if (!gl.getProgramParameter(ShaderProgramObject, gl.LINK_STATUS)) {
      var error = gl.getProgramInfoLog(ShaderProgramObject);
      console.log("Shader Linking Error: " + error);
      uninitialize();
      return;
    } else {
      console.log("Shader Linked Successfully");
    }

    modelViewMatrixUniform = gl.getUniformLocation(
      ShaderProgramObject,
      "uModelViewMatrix"
    );
    projectionMatrixUniform = gl.getUniformLocation(
      ShaderProgramObject,
      "uProjectionViewMatrix"
    );
    ldUniform = gl.getUniformLocation(ShaderProgramObject, "uLd");
    kdUniform = gl.getUniformLocation(ShaderProgramObject, "uKd");
    lightPositionUniform = gl.getUniformLocation(
      ShaderProgramObject,
      "uLightPosition"
    );
    keyPressedUniform = gl.getUniformLocation(
      ShaderProgramObject,
      "ukeypressed"
    );

    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
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

  var modelViewMatrix = mat4.identity(mat4.create());
  var modelViewProjectionMatrix = mat4.identity(mat4.create());

  mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
  mat4.multiply(
    modelViewProjectionMatrix,
    perspectiveProjectionMatrix,
    modelViewMatrix
  );

  gl.uniformMatrix4fv(modelViewMatrixUniform, false, modelViewMatrix);
  gl.uniformMatrix4fv(
    projectionMatrixUniform,
    false,
    perspectiveProjectionMatrix
  );

  if (bLightingEnabled == true) {
    gl.uniform1i(keyPressedUniform, 1);
    gl.uniform3fv(ldUniform, lightDiffuse);
    gl.uniform3fv(kdUniform, materialDiffuse);
    gl.uniform4fv(lightPositionUniform, lightPosition);
  } else {
    gl.uniform1i(keyPressedUniform, 0);
  }

  sphere.draw();

  gl.useProgram(null);

  requestAnimationFrame(display, canvas);
}

function uninitialize() {
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

  if (sphere) {
    sphere.deallocate();
    sphere = null;
  }
}
