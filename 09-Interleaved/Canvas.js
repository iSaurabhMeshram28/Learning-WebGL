
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
  AMC_ATTRIBUTE_COLOR: 2,
  AMC_ATTRIBUTE_TEXCOORD: 3,
};

var ShaderProgramObject = null;

var vao_Cube = null;
var vbo_CubePosition = null;

var modelMatrixUniform;
var viewMatrixUniform;
var projectionMatrixUniform;

var lightDiffuseUniform;
var lightAmbientUniform;
var lightSpecularUniform;
var lightPositionUniform;
var materialAmbientUniform;
var materialDiffuseUniform;
var materialSpecularUniform;
var materialShininessUniform;
var keyPressedUniform;
var textureSamplerUniform;

var bLightingEnabled = false;

var lightAmbient = new Float32Array([0.1, 0.1, 0.1]);
var lightDiffuse = new Float32Array([1.0, 1.0, 1.0]);
var lightSpecular = new Float32Array([1.0, 1.0, 1.0]);
var lightPosition = new Float32Array([100.0, 100.0, 100.0, 1.0]);

var materialAmbient = new Float32Array([0.0, 0.0, 0.0]);
var materialDiffuse = new Float32Array([1.0, 1.0, 1.0]);
var materialSpecular = new Float32Array([1.0, 1.0, 1.0]);
var materialShininess = 50.0;

var perspectiveProjectionMatrix;

var texture_Marble = null;
var cAngle = 0.0;

function main() {
  canvas = document.getElementById("ssm");
  if (!canvas) {
    console.error("Failed to get canvas element");
    return;
  }

  canvas_original_width = canvas.width;
  canvas_original_height = canvas.height;

  window.addEventListener("keydown", keyDown, false);
  window.addEventListener("click", mouseDown, false);
  window.addEventListener("resize", resize, false);

  initialize();
  resize();
  display();
}

function keyDown(event) {
  switch (event.keyCode) {
    case 81: // 'Q' or 'q'
      uninitialize();
      window.close();
      break;
    case 70: // 'F' or 'f'
      toggleFullScreen();
      break;
    case 76: // 'L'
    case 108: // 'l'
      bLightingEnabled = !bLightingEnabled;
      console.log("Lighting " + (bLightingEnabled ? "Enabled" : "Disabled"));
      break;
  }
}

function mouseDown() {}

function toggleFullScreen() {
  var fullScreenElement =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;

  if (!fullScreenElement) {
    if (canvas.requestFullscreen) canvas.requestFullscreen();
    else if (canvas.webkitRequestFullscreen) canvas.webkitRequestFullscreen();
    else if (canvas.mozRequestFullScreen) canvas.mozRequestFullScreen();
    else if (canvas.msRequestFullscreen) canvas.msRequestFullscreen();
    bFullScreen = true;
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
    bFullScreen = false;
  }
}

function initialize() {
  gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("Failed to get WebGL2 context");
    return;
  }

  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;

  var vertexShaderSourceCode = `#version 300 es
                                precision highp float;
                                precision highp int;
                                in vec4 aPosition;
                                in vec3 aNormal;
                                in vec4 aColor;
                                out vec4 oColor;
                                in vec2 aTexcoord;
                                out vec2 oTexcoord;
                                uniform mat4 uModelMatrix;
                                uniform mat4 uViewMatrix;
                                uniform mat4 uProjectionViewMatrix;
                                uniform vec4 uLightPosition;
                                uniform int ukeypressed;
                                out vec3 oTransformedNormals;
                                out vec3 oLightDirection;
                                out vec3 oViewerVector;
                                void main() {
                                  if (ukeypressed == 1) {
                                    vec4 iCoordinates = uViewMatrix * uModelMatrix * aPosition;
                                    oTransformedNormals = mat3(uViewMatrix * uModelMatrix) * aNormal;
                                    oLightDirection = vec3(uLightPosition - iCoordinates);
                                    oViewerVector = -iCoordinates.xyz;
                                  } else {
                                    oTransformedNormals = vec3(0.0, 0.0, 0.0);
                                    oLightDirection = vec3(0.0, 0.0, 0.0);
                                    oViewerVector = vec3(0.0, 0.0, 0.0);
                                  }
                                  gl_Position = uProjectionViewMatrix * uViewMatrix * uModelMatrix * aPosition;
                                  oTexcoord = aTexcoord;
                                  oColor = aColor;
                                }`;

  var vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
  gl.compileShader(vertexShaderObject);

  if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
    console.error("Vertex Shader Compilation Error: ", gl.getShaderInfoLog(vertexShaderObject));
    uninitialize();
    return;
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
                                  in vec2 oTexcoord;
                                  uniform sampler2D uTextureSampler;
                                  out vec4 FragColor;
                                  void main() {
                                    vec3 Phong_ADS_Light;
                                    if (ukeypressed == 1) {
                                      vec3 normalisedTransformedNormal = normalize(oTransformedNormals);
                                      vec3 normalisedLightDirection = normalize(oLightDirection);
                                      vec3 normalisedViewerVector = normalize(oViewerVector);
                                      vec3 ambientLight = uLightAmbient * uMaterialAmbient;
                                      vec3 DiffusedLight = uLightDiffuse * uMaterialDiffuse * max(dot(normalisedLightDirection, normalisedTransformedNormal), 0.0);
                                      vec3 reflectionVector = reflect(-normalisedLightDirection, normalisedTransformedNormal);
                                      vec3 specularLight = uLightSpecular * uMaterialSpecular * pow(max(dot(reflectionVector, normalisedViewerVector), 0.0), uMaterialShininess);
                                      Phong_ADS_Light = ambientLight + DiffusedLight + specularLight;
                                    } else {
                                      Phong_ADS_Light = vec3(1.0, 1.0, 1.0);
                                    }
                                    vec3 tex = vec3(texture(uTextureSampler, oTexcoord));
                                    FragColor = vec4(tex * vec3(oColor) * Phong_ADS_Light, 1.0);
                                  }`;

  var fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
  gl.compileShader(fragmentShaderObject);

  if (!gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS)) {
    console.error("Fragment Shader Compilation Error: ", gl.getShaderInfoLog(fragmentShaderObject));
    uninitialize();
    return;
  }

  ShaderProgramObject = gl.createProgram();
  gl.attachShader(ShaderProgramObject, vertexShaderObject);
  gl.attachShader(ShaderProgramObject, fragmentShaderObject);

  gl.bindAttribLocation(ShaderProgramObject, VertexAttributeEnum.AMC_ATTRIBUTE_POSITION, "aPosition");
  gl.bindAttribLocation(ShaderProgramObject, VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL, "aNormal");
  gl.bindAttribLocation(ShaderProgramObject, VertexAttributeEnum.AMC_ATTRIBUTE_TEXCOORD, "aTexcoord");
  gl.bindAttribLocation(ShaderProgramObject, VertexAttributeEnum.AMC_ATTRIBUTE_COLOR, "aColor");

  gl.linkProgram(ShaderProgramObject);

  if (!gl.getProgramParameter(ShaderProgramObject, gl.LINK_STATUS)) {
    console.error("Shader Program Linking Error: ", gl.getProgramInfoLog(ShaderProgramObject));
    uninitialize();
    return;
  }

  modelMatrixUniform = gl.getUniformLocation(ShaderProgramObject, "uModelMatrix");
  viewMatrixUniform = gl.getUniformLocation(ShaderProgramObject, "uViewMatrix");
  projectionMatrixUniform = gl.getUniformLocation(ShaderProgramObject, "uProjectionViewMatrix");
  lightAmbientUniform = gl.getUniformLocation(ShaderProgramObject, "uLightAmbient");
  lightDiffuseUniform = gl.getUniformLocation(ShaderProgramObject, "uLightDiffuse");
  lightSpecularUniform = gl.getUniformLocation(ShaderProgramObject, "uLightSpecular");
  lightPositionUniform = gl.getUniformLocation(ShaderProgramObject, "uLightPosition");
  materialAmbientUniform = gl.getUniformLocation(ShaderProgramObject, "uMaterialAmbient");
  materialDiffuseUniform = gl.getUniformLocation(ShaderProgramObject, "uMaterialDiffuse");
  materialSpecularUniform = gl.getUniformLocation(ShaderProgramObject, "uMaterialSpecular");
  materialShininessUniform = gl.getUniformLocation(ShaderProgramObject, "uMaterialShininess");
  textureSamplerUniform = gl.getUniformLocation(ShaderProgramObject, "uTextureSampler");
  keyPressedUniform = gl.getUniformLocation(ShaderProgramObject, "ukeypressed");

  var cube_PCNT = new Float32Array([
    // Vertex data for the cube (position, color, normal, texture)
    // front
    1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0,
    0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, -1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0,
    1.0, 0.0, 0.0, 1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0,

    // right
    1.0, 1.0, -1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0,
    0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0, -1.0, -1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0,

    // back
    1.0, 1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 0.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0,
    1.0, 1.0, 0.0, 0.0, 0.0, -1.0, 0.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 0.0,
    0.0, 0.0, -1.0, 0.0, 0.0, 1.0, -1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 0.0, -1.0,
    1.0, 0.0,

    // left
    -1.0, 1.0, 1.0, 1.0, 0.0, 1.0, -1.0, 0.0, 0.0, 1.0, 1.0, -1.0, 1.0, -1.0,
    1.0, 0.0, 1.0, -1.0, 0.0, 0.0, 0.0, 1.0, -1.0, -1.0, -1.0, 1.0, 0.0, 1.0,
    -1.0, 0.0, 0.0, 0.0, 0.0, -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, -1.0, 0.0, 0.0,
    1.0, 0.0,

    // top
    1.0, 1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, -1.0, 1.0, -1.0,
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,
    1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0,

    // bottom
    1.0, -1.0, 1.0, 1.0, 0.5, 0.0, 0.0, -1.0, 0.0, 1.0, 1.0, -1.0, -1.0, 1.0,
    1.0, 0.5, 0.0, 0.0, -1.0, 0.0, 0.0, 1.0, -1.0, -1.0, -1.0, 1.0, 0.5, 0.0,
    0.0, -1.0, 0.0, 0.0, 0.0, 1.0, -1.0, -1.0, 1.0, 0.5, 0.0, 0.0, -1.0, 0.0,
    1.0, 0.0,
  ]);

  vao_Cube = gl.createVertexArray();
  gl.bindVertexArray(vao_Cube);

  vbo_CubePosition = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_CubePosition);
  gl.bufferData(gl.ARRAY_BUFFER, cube_PCNT, gl.STATIC_DRAW);

  gl.vertexAttribPointer(VertexAttributeEnum.AMC_ATTRIBUTE_POSITION, 3, gl.FLOAT, false, 11 * 4, 0);
  gl.enableVertexAttribArray(VertexAttributeEnum.AMC_ATTRIBUTE_POSITION);

  gl.vertexAttribPointer(VertexAttributeEnum.AMC_ATTRIBUTE_COLOR, 3, gl.FLOAT, false, 11 * 4, 3 * 4);
  gl.enableVertexAttribArray(VertexAttributeEnum.AMC_ATTRIBUTE_COLOR);

  gl.vertexAttribPointer(VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL, 3, gl.FLOAT, false, 11 * 4, 6 * 4);
  gl.enableVertexAttribArray(VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL);

  gl.vertexAttribPointer(VertexAttributeEnum.AMC_ATTRIBUTE_TEXCOORD, 2, gl.FLOAT, false, 11 * 4, 9 * 4);
  gl.enableVertexAttribArray(VertexAttributeEnum.AMC_ATTRIBUTE_TEXCOORD);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);

  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  loadGLTexture();

  perspectiveProjectionMatrix = mat4.create();
}

function loadGLTexture() {
  texture_Marble = gl.createTexture();
  texture_Marble.image = new Image();
  texture_Marble.image.src = "marble.bmp";
  texture_Marble.image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture_Marble);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_Marble.image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };
}

function resize() {
  if (canvas.height == 0) canvas.height = 1;

  if (bFullScreen) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    canvas.width = canvas_original_width;
    canvas.height = canvas_original_height;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);

  mat4.perspective(perspectiveProjectionMatrix, 45.0, parseFloat(canvas.width) / parseFloat(canvas.height), 0.1, 100.0);
}

function display() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(ShaderProgramObject);

  let modelMatrix = mat4.create();
  let viewMatrix = mat4.create();
  let projectionMatrix = perspectiveProjectionMatrix; 

  let translationMatrix = mat4.create();
  mat4.translate(translationMatrix, translationMatrix, [0.0, 0.0, -6.0]);

  let scaleMatrix = mat4.create();
  mat4.scale(scaleMatrix, scaleMatrix, [0.75, 0.75, 0.75]);

  let rotationMatrixX = mat4.create();
  mat4.rotateX(rotationMatrixX, rotationMatrixX, cAngle);

  let rotationMatrixY = mat4.create();
  mat4.rotateY(rotationMatrixY, rotationMatrixY, cAngle);

  let rotationMatrixZ = mat4.create();
  mat4.rotateZ(rotationMatrixZ, rotationMatrixZ, cAngle);

  let rotationMatrix = mat4.create();
  mat4.multiply(rotationMatrix, rotationMatrixX, rotationMatrixY);
  mat4.multiply(rotationMatrix, rotationMatrix, rotationMatrixZ);

  mat4.multiply(modelMatrix, translationMatrix, scaleMatrix);
  mat4.multiply(modelMatrix, modelMatrix, rotationMatrix);

  gl.uniformMatrix4fv(modelMatrixUniform, false, modelMatrix);
  gl.uniformMatrix4fv(viewMatrixUniform, false, viewMatrix);
  gl.uniformMatrix4fv(projectionMatrixUniform, false, projectionMatrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture_Marble);
  gl.uniform1i(textureSamplerUniform, 0);

  if (bLightingEnabled) {
    gl.uniform1i(keyPressedUniform, 1);

    gl.uniform3fv(lightAmbientUniform, lightAmbient);
    gl.uniform3fv(lightDiffuseUniform, lightDiffuse);
    gl.uniform3fv(lightSpecularUniform, lightSpecular);
    gl.uniform4fv(lightPositionUniform, lightPosition);

    gl.uniform3fv(materialAmbientUniform, materialAmbient);
    gl.uniform3fv(materialDiffuseUniform, materialDiffuse);
    gl.uniform3fv(materialSpecularUniform, materialSpecular);
    gl.uniform1f(materialShininessUniform, materialShininess);
  } else {
    gl.uniform1i(keyPressedUniform, 0);
  }

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
  cAngle -= 0.01;
  if (cAngle <= 0.0) cAngle += 360.0;
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

  if (vbo_CubePosition) {
    gl.deleteBuffer(vbo_CubePosition);
    vbo_CubePosition = null;
  }

  if (vao_Cube) {
    gl.deleteVertexArray(vao_Cube);
    vao_Cube = null;
  }

  if (texture_Marble) {
    gl.deleteTexture(texture_Marble);
    texture_Marble = null;
  }
}

