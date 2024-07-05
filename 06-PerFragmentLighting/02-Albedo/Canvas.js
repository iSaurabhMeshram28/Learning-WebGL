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

var ShaderProgramObject = null;
var perspectiveProjectionMatrix;

var modelMatrixUniform;
var viewMatrixUniform;
var projectionMatrixUniform;

var lightDiffuseUniform;
var lightAmbientUniform;
var lightSpecularUniform;
var LightPositionUniform;
var materialAmbientUniform;
var materialDiffuseUniform;
var materialSpecularUniform;
var materialShininessUniform;
var keyPressedUniform;

var bLightingEnabled = false;
var sphere = null;

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

function initialize() {
  gl = canvas.getContext("webgl2");
  if (gl == null) {
    console.log("Getting WebGL2 context Failed\n");
    return;
  } else {
    console.log("Getting WebGL2 context Succeeded");
  }

  var vertexShaderSourceCode = `#version 300 es
    precision highp float;
    precision highp int;
           in vec4 aPosition; 
        in vec3 aNormal; 
        in vec4 aColor; 
        out vec4 oColor; 
        uniform mat4 uModelMatrix; 
        uniform mat4 uViewMatrix; 
        uniform mat4 uProjectionViewMatrix; 
        uniform vec4 uLightPosition; 
        uniform int ukeypressed; 
        out vec3 oTransformedNormals; 
        out vec3 oLightDirection; 
        out vec3 oViewerVector; 
        void main() 
        { 
        if(ukeypressed == 1) 
        { 
        vec4 iCoordinates = uViewMatrix * uModelMatrix * aPosition; 
        oTransformedNormals = mat3(uViewMatrix * uModelMatrix) * aNormal; 
        oLightDirection = vec3(uLightPosition - iCoordinates); 
        oViewerVector = -iCoordinates.xyz; 
        }
        else 
        { 
        oTransformedNormals = vec3(0.0, 0.0, 0.0); 
        oLightDirection = vec3(0.0, 0.0, 0.0); 
        oViewerVector = vec3(0.0, 0.0, 0.0); 
        } 
        gl_Position = uProjectionViewMatrix * uViewMatrix * uModelMatrix * aPosition; 
        }`;

  var vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
  gl.compileShader(vertexShaderObject);

  if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
    var error = gl.getShaderInfoLog(vertexShaderObject);
    if (error.length > 0) {
      console.log("Vertex Shader Compilation Error: " + error);
      uninitialize();
      return;
    }
  } else {
    console.log("Vertex Shader Compiled Successfully");
  }

  var fragmentShaderSourceCode = `#version 300 es
    precision highp float;
    precision highp int;
   in vec4 oColor; 
        in vec3 oTransformedNormals; 
        in vec3 oLightDirection; 
        in vec3 oViewerVector; 
        uniform vec3 uLightAmbient; 
        uniform vec3 uLightDiffuse; 
        uniform vec3 uLightSpecular; 
        uniform vec3 uMaterialAmbient; 
        uniform vec3 uMaterialDiffuse; 
        uniform vec3 uMaterialSpecular; 
        uniform float uMaterialShininess; 
        uniform int ukeypressed; 
        out vec4 FragColor; 
        void main() 
        { 
        vec3 Phong_ADS_Light; 
        if(ukeypressed == 1) 
        { 
        vec3 normalisedTransformedNormal = normalize(oTransformedNormals); 
        vec3 normalisedLightDirection = normalize(oLightDirection); 
        vec3 normalisedViewerVector = normalize(oViewerVector); 
        vec3 ambientLight = uLightAmbient * uMaterialAmbient; 
        vec3 DiffusedLight = uLightDiffuse * uMaterialDiffuse * max(dot(normalisedLightDirection, normalisedTransformedNormal), 0.0); 
        vec3 reflectionVector = reflect(-normalisedLightDirection, normalisedTransformedNormal); 
        vec3 specularLight = uLightSpecular * uMaterialSpecular * pow(max(dot(reflectionVector, normalisedViewerVector), 0.0), uMaterialShininess); 
        Phong_ADS_Light = ambientLight + DiffusedLight + specularLight; 
        } 
        else 
        { 
        Phong_ADS_Light = vec3(1.0, 1.0, 1.0); 
        } 
        FragColor = vec4(Phong_ADS_Light, 1.0); 
        }`;

  var fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
  gl.compileShader(fragmentShaderObject);

  if (!gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS)) {
    var error = gl.getShaderInfoLog(fragmentShaderObject);
    if (error.length > 0) {
      console.log("Fragment Shader Compilation Error: " + error);
      uninitialize();
      return;
    }
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
    if (error.length > 0) {
      console.log("Shader Linking Error: " + error);
      uninitialize();
      return;
    }
  } else {
    console.log("Shader Linked Successfully");
  }

  modelMatrixUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uModelMatrix"
  );
  viewMatrixUniform = gl.getUniformLocation(ShaderProgramObject, "uViewMatrix");
  projectionMatrixUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uProjectionViewMatrix"
  );
  lightAmbientUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uLightAmbient"
  );
  lightDiffuseUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uLightDiffuse"
  );
  lightSpecularUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uLightSpecular"
  );
  LightPositionUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uLightPosition"
  );
  materialAmbientUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uMaterialAmbient"
  );
  materialDiffuseUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uMaterialDiffuse"
  );
  materialSpecularUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uMaterialSpecular"
  );
  materialShininessUniform = gl.getUniformLocation(
    ShaderProgramObject,
    "uMaterialShininess"
  );

  keyPressedUniform = gl.getUniformLocation(ShaderProgramObject, "ukeypressed");

  sphere = new Mesh();
  makeSphere(sphere, 1.0, 30, 30);

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

  var modelMatrix = mat4.create();
  var viewMatrix = mat4.create();

  mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -3.0]);

  gl.uniformMatrix4fv(modelMatrixUniform, false, modelMatrix);
  gl.uniformMatrix4fv(viewMatrixUniform, false, viewMatrix);
  gl.uniformMatrix4fv(
    projectionMatrixUniform,
    false,
    perspectiveProjectionMatrix
  );  

  if (bLightingEnabled == true) {
    gl.uniform1i(keyPressedUniform, 1);

    gl.uniform3fv(lightAmbientUniform, lightAmbient);
    gl.uniform3fv(lightDiffuseUniform, lightDiffuse);
    gl.uniform3fv(lightSpecularUniform, lightSpecular);
    gl.uniform4fv(LightPositionUniform, lightPosition);

    gl.uniform3fv(materialAmbientUniform, materialAmbient);
    gl.uniform3fv(materialDiffuseUniform, materialDiffuse);
    gl.uniform3fv(materialSpecularUniform, materialSpecular);
    gl.uniform1f(materialShininessUniform, materialShininess);
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
