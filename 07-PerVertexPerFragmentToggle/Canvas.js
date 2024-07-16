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

// WebGL related variables
const VertexAttributeEnum = {
  AMC_ATTRIBUTE_POSITION: 0,
  AMC_ATTRIBUTE_NORMAL: 1,
  AMC_ATTRIBUTE_COLOR: 2,
  AMC_ATTRIBUTE_TEXCOORD: 3,
};

var shaderProgramObject_pv = null;
var ShaderProgramObject_pf = null;
var perspectiveProjectionMatrix;

var modelMatrixUniform_pv, viewMatrixUniform_pv, projectionMatrixUniform_pv;
var lightAmbientUniform_pv,
  lightDiffuseUniform_pv,
  lightSpecularUniform_pv,
  LightPositionUniform_pv;
var materialAmbientUniform_pv,
  materialDiffuseUniform_pv,
  materialSpecularUniform_pv,
  materialShininessUniform_pv,
  keyPressedUniform_pv;

var modelMatrixUniform_pf, viewMatrixUniform_pf, projectionMatrixUniform_pf;
var lightAmbientUniform_pf,
  lightDiffuseUniform_pf,
  lightSpecularUniform_pf,
  LightPositionUniform_pf;
var materialAmbientUniform_pf,
  materialDiffuseUniform_pf,
  materialSpecularUniform_pf,
  materialShininessUniform_pf,
  keyPressedUniform_pf;

var bLightingEnabled = false;
var sphere = null;

var chosenShader = "v";

var lightAmbient = new Float32Array([0.1, 0.1, 0.1]);
var lightDiffuse = new Float32Array([1.0, 1.0, 1.0]);
var lightSpecular = new Float32Array([1.0, 1.0, 1.0]);
var lightPosition = new Float32Array([100.0, 100.0, 100.0, 1.0]);

var materialAmbient = new Float32Array([0.0, 0.0, 0.0]);
var materialDiffuse = new Float32Array([0.5, 0.2, 0.7]);
var materialSpecular = new Float32Array([0.7, 0.7, 0.7]);
var materialShininess = 128.0;

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
    case 76: // 'L'
    case 108: // 'l'
      bLightingEnabled = !bLightingEnabled;
      if (bLightingEnabled) {
        chosenShader = "v";
      }
      console.log("Lighting " + (bLightingEnabled ? "Enabled" : "Disabled"));
      break;
    case 86: // 'V'
    case 118: // 'v'
      if (bLightingEnabled == false) {
        chosenShader = "v";
        bLightingEnabled = true;
      } else {
        chosenShader = "v";
      }
      break;
    case 70: // 'F'
    case 102: // 'f'
      if (bLightingEnabled == false) {
        chosenShader = "f";
        bLightingEnabled = true;
      } else {
        chosenShader = "f";
      }
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

  //for PerVertex
  try {
    const vertexShaderSourceCode_pv = await loadShaderFile(
      "vertexShader_pv.glsl"
    );
    const fragmentShaderSourceCode_pv = await loadShaderFile(
      "fragmentShader_pv.glsl"
    );

    const vertexShaderSourceCode_pf = await loadShaderFile(
      "vertexShader_pf.glsl"
    );
    const fragmentShaderSourceCode_pf = await loadShaderFile(
      "fragmentShader_pf.glsl"
    );

    var vertexShaderObject_pv = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObject_pv, vertexShaderSourceCode_pv);
    gl.compileShader(vertexShaderObject_pv);

    if (!gl.getShaderParameter(vertexShaderObject_pv, gl.COMPILE_STATUS)) {
      var error = gl.getShaderInfoLog(vertexShaderObject_pv);
      if (error.length > 0) {
        console.log("Vertex Shader Compilation Error (PV): " + error);
        uninitialize();
        return;
      }
    } else {
      console.log("Vertex Shader (PV) Compiled Successfully");
    }

    var fragmentShaderObject_pv = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShaderObject_pv, fragmentShaderSourceCode_pv);
    gl.compileShader(fragmentShaderObject_pv);

    if (!gl.getShaderParameter(fragmentShaderObject_pv, gl.COMPILE_STATUS)) {
      var error = gl.getShaderInfoLog(fragmentShaderObject_pv);
      if (error.length > 0) {
        console.log("Fragment Shader Compilation Error (PV): " + error);
        uninitialize();
        return;
      }
    } else {
      console.log("Fragment Shader (PV) Compiled Successfully");
    }

    shaderProgramObject_pv = gl.createProgram();
    gl.attachShader(shaderProgramObject_pv, vertexShaderObject_pv);
    gl.attachShader(shaderProgramObject_pv, fragmentShaderObject_pv);

    gl.bindAttribLocation(
      shaderProgramObject_pv,
      VertexAttributeEnum.AMC_ATTRIBUTE_POSITION,
      "aPosition"
    );
    gl.bindAttribLocation(
      shaderProgramObject_pv,
      VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL,
      "aNormal"
    );

    gl.linkProgram(shaderProgramObject_pv);

    if (!gl.getProgramParameter(shaderProgramObject_pv, gl.LINK_STATUS)) {
      var error = gl.getProgramInfoLog(shaderProgramObject_pv);
      if (error.length > 0) {
        console.log("Shader Program Linking Error (PV): " + error);
        uninitialize();
        return;
      }
    } else {
      console.log("Shader Program (PV) Linked Successfully");
    }

    modelMatrixUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uModelMatrix"
    );
    viewMatrixUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uViewMatrix"
    );
    projectionMatrixUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uProjectionViewMatrix"
    );
    lightAmbientUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uLightAmbient"
    );
    lightDiffuseUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uLightDiffuse"
    );
    lightSpecularUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uLightSpecular"
    );
    LightPositionUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uLightPosition"
    );
    materialAmbientUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uMaterialAmbient"
    );
    materialDiffuseUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uMaterialDiffuse"
    );
    materialSpecularUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uMaterialSpecular"
    );
    materialShininessUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "uMaterialShininess"
    );
    keyPressedUniform_pv = gl.getUniformLocation(
      shaderProgramObject_pv,
      "ukeypressed"
    );

    //for perFragmnet
    var vertexShaderObject_pf = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObject_pf, vertexShaderSourceCode_pf);
    gl.compileShader(vertexShaderObject_pf);

    if (!gl.getShaderParameter(vertexShaderObject_pf, gl.COMPILE_STATUS)) {
      var error = gl.getShaderInfoLog(vertexShaderObject_pf);
      if (error.length > 0) {
        console.log("Vertex Shader Compilation Error (PF): " + error);
        uninitialize();
        return;
      }
    } else {
      console.log("Vertex Shader (PF) Compiled Successfully");
    }

    var fragmentShaderObject_pf = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShaderObject_pf, fragmentShaderSourceCode_pf);
    gl.compileShader(fragmentShaderObject_pf);

    if (!gl.getShaderParameter(fragmentShaderObject_pf, gl.COMPILE_STATUS)) {
      var error = gl.getShaderInfoLog(fragmentShaderObject_pf);
      if (error.length > 0) {
        console.log("Fragment Shader Compilation Error (PF): " + error);
        uninitialize();
        return;
      }
    } else {
      console.log("Fragment Shader (PF) Compiled Successfully");
    }

    shaderProgramObject_pf = gl.createProgram();
    gl.attachShader(shaderProgramObject_pf, vertexShaderObject_pf);
    gl.attachShader(shaderProgramObject_pf, fragmentShaderObject_pf);

    gl.bindAttribLocation(
      shaderProgramObject_pf,
      VertexAttributeEnum.AMC_ATTRIBUTE_POSITION,
      "aPosition"
    );
    gl.bindAttribLocation(
      shaderProgramObject_pf,
      VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL,
      "aNormal"
    );

    gl.linkProgram(shaderProgramObject_pf);

    if (!gl.getProgramParameter(shaderProgramObject_pf, gl.LINK_STATUS)) {
      var error = gl.getProgramInfoLog(shaderProgramObject_pf);
      if (error.length > 0) {
        console.log("Shader Program Linking Error (PF): " + error);
        uninitialize();
        return;
      }
    } else {
      console.log("Shader Program (PF) Linked Successfully");
    }

    modelMatrixUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uModelMatrix"
    );
    viewMatrixUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uViewMatrix"
    );
    projectionMatrixUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uProjectionViewMatrix"
    );
    lightAmbientUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uLightAmbient"
    );
    lightDiffuseUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uLightDiffuse"
    );
    lightSpecularUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uLightSpecular"
    );
    LightPositionUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uLightPosition"
    );
    materialAmbientUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uMaterialAmbient"
    );
    materialDiffuseUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uMaterialDiffuse"
    );
    materialSpecularUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uMaterialSpecular"
    );
    materialShininessUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
      "uMaterialShininess"
    );
    keyPressedUniform_pf = gl.getUniformLocation(
      shaderProgramObject_pf,
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

  var modelMatrix_pv = mat4.create();
  var viewMatrix_pv = mat4.create();
  mat4.translate(modelMatrix_pv, modelMatrix_pv, [0.0, 0.0, -3.0]);

  var modelMatrix_pf = mat4.create();
  var viewMatrix_pf = mat4.create();
  mat4.translate(modelMatrix_pf, modelMatrix_pf, [0.0, 0.0, -3.0]);

  if (chosenShader == "v") {
    gl.useProgram(shaderProgramObject_pv);
    gl.uniformMatrix4fv(modelMatrixUniform_pv, false, modelMatrix_pv);
    gl.uniformMatrix4fv(viewMatrixUniform_pv, false, viewMatrix_pv);
    gl.uniformMatrix4fv(
      projectionMatrixUniform_pv,
      false,
      perspectiveProjectionMatrix
    );
  } else if (chosenShader == "f") {
    gl.useProgram(shaderProgramObject_pf);
    gl.uniformMatrix4fv(modelMatrixUniform_pf, false, modelMatrix_pf);
    gl.uniformMatrix4fv(viewMatrixUniform_pf, false, viewMatrix_pf);
    gl.uniformMatrix4fv(
      projectionMatrixUniform_pf,
      false,
      perspectiveProjectionMatrix
    );
  }

  if (bLightingEnabled) {
    if (chosenShader == "v") {
      gl.uniform1i(keyPressedUniform_pv, 1);
      gl.uniform3fv(lightAmbientUniform_pv, lightAmbient);
      gl.uniform3fv(lightDiffuseUniform_pv, lightDiffuse);
      gl.uniform3fv(lightSpecularUniform_pv, lightSpecular);
      gl.uniform4fv(LightPositionUniform_pv, lightPosition);
      gl.uniform3fv(materialAmbientUniform_pv, materialAmbient);
      gl.uniform3fv(materialDiffuseUniform_pv, materialDiffuse);
      gl.uniform3fv(materialSpecularUniform_pv, materialSpecular);
      gl.uniform1f(materialShininessUniform_pv, materialShininess);
    } else if (chosenShader == "f") {
      gl.uniform1i(keyPressedUniform_pf, 1);
      gl.uniform3fv(lightAmbientUniform_pf, lightAmbient);
      gl.uniform3fv(lightDiffuseUniform_pf, lightDiffuse);
      gl.uniform3fv(lightSpecularUniform_pf, lightSpecular);
      gl.uniform4fv(LightPositionUniform_pf, lightPosition);
      gl.uniform3fv(materialAmbientUniform_pf, materialAmbient);
      gl.uniform3fv(materialDiffuseUniform_pf, materialDiffuse);
      gl.uniform3fv(materialSpecularUniform_pf, materialSpecular);
      gl.uniform1f(materialShininessUniform_pf, materialShininess);
    }
  } else {
    if (chosenShader == "v") {
      gl.uniform1i(keyPressedUniform_pv, 0);
    } else if (chosenShader == "f") {
      gl.uniform1i(keyPressedUniform_pf, 0);
    }
  }

  sphere.draw();

  gl.useProgram(null);

  requestAnimationFrame(display, canvas);
}

function uninitialize() {
  if (shaderProgramObject_pv) {
    gl.useProgram(shaderProgramObject_pv);
    var shaderObjects = gl.getAttachedShaders(shaderProgramObject_pv);
    if (shaderObjects && shaderObjects.length > 0) {
      for (let i = 0; i < shaderObjects.length; i++) {
        gl.detachShader(shaderProgramObject_pv, shaderObjects[i]);
        gl.deleteShader(shaderObjects[i]);
        shaderObjects[i] = null;
      }
    }

    gl.useProgram(null);
    gl.deleteProgram(shaderProgramObject_pv);
    shaderProgramObject_pv = null;
  }

  if (sphere) {
    sphere.deallocate();
    sphere = null;
  }
}
