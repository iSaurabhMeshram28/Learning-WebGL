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
  AMC_ATTRIBUTE_TEXTURE: 2,
};

var program = null;

var vao_Cube = null;
var vbo_CubePosition = null;
var vbo_CubeNormal = null;
var vbo_Texcoord = null;
var texture_Kundali = null;

var ptL_modelMatrixUniform, ptL_viewMatrixUniform, ptL_projectionMatrixUniform;
var ptL_viewPosUniform;
var ptL_materialDiffuseUniform,
  ptL_materialSpecularUniform,
  ptL_materialShininessUniform;

// Define the number of point lights
const ptL_numPointLights = 4;

// Create an array of uniforms for each point light
var pointLightUniforms = [];

var perspectiveProjectionMatrix;

var cangle = 0.0;

function main() {
  canvas = document.getElementById("ssm");
  if (canvas == null) {
    console.log("Getting Canvas Failed\n");
  } else {
    console.log("Getting canvas Succeed");
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
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;

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
  gl = canvas.getContext("webgl2");
  if (gl == null) {
    console.log("Getting WebGL2 context Failed\n");
  } else {
    console.log("Getting WebGL2 context Succeeded");
  }

  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;

  var vertexShaderSourceCode = `#version 300 es
  layout (location = 0) in vec3 aPos;
  layout (location = 1) in vec3 aNormal;
  layout (location = 2) in vec2 aTexCoords;

  out vec3 FragPos;
  out vec3 Normal;
  out vec2 TexCoords;

  uniform mat4 model;
  uniform mat4 view;
  uniform mat4 projection;

  void main()
  {
      FragPos = vec3(model * vec4(aPos, 1.0));
      Normal = mat3(transpose(inverse(model))) * aNormal;  
      TexCoords = aTexCoords;
    
      gl_Position = projection * view * vec4(FragPos, 1.0);
  }`;

  var vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
  gl.compileShader(vertexShaderObject);
  if (gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS) == false) {
    var error = gl.getShaderInfoLog(vertexShaderObject);
    if (error.length > 0) {
      console.log("Vertex Shader Compilation error : " + error);
      uninitialize();
    }
  } else {
    console.log("Vertex Shader Compiled Successfully");
  }

  var fragmentShaderSourceCode = `#version 300 es
  precision highp float;
  out vec4 FragColor;

  struct Material {
      sampler2D diffuse;
      sampler2D specular;
      float shininess;
  };

  struct PointLight {
      vec3 position;
      float constant;
      float linear;
      float quadratic;
      vec3 ambient;
      vec3 diffuse;
      vec3 specular;
  };  

  in vec3 FragPos;
  in vec3 Normal;
  in vec2 TexCoords;

  uniform vec3 viewPos;
  uniform PointLight pointLights[4];
  uniform Material material;

  void main()
  {    
      vec3 norm = normalize(Normal);
      vec3 viewDir = normalize(viewPos - FragPos);
      vec3 result = vec3(0.0);

    for (int i = 0; i < 4; i++) {
        vec3 lightDir = normalize(pointLights[i].position - FragPos);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 reflectDir = reflect(-lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
        float distance = length(pointLights[i].position - FragPos);
        float attenuation = 1.0 / (pointLights[i].constant + pointLights[i].linear * distance + pointLights[i].quadratic * (distance * distance));
        vec3 ambient = pointLights[i].ambient * vec3(texture(material.diffuse, TexCoords));
        vec3 diffuse = pointLights[i].diffuse * diff * vec3(texture(material.diffuse, TexCoords));
        vec3 specular = pointLights[i].specular * spec * vec3(texture(material.specular, TexCoords));
        ambient *= attenuation;
        diffuse *= attenuation;
        specular *= attenuation;
        result += ambient + diffuse + specular;
    }
      FragColor = vec4(result, 1.0);
  }`;

  var fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
  gl.compileShader(fragmentShaderObject);
  if (gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS) == false) {
    var error = gl.getShaderInfoLog(fragmentShaderObject);
    if (error.length > 0) {
      console.log("Fragment Shader Compilation error : " + error);
      uninitialize();
    }
  } else {
    console.log("Fragment Shader Compiled Successfully");
  }

  program = gl.createProgram();
  gl.attachShader(program, vertexShaderObject);
  gl.attachShader(program, fragmentShaderObject);
  gl.bindAttribLocation(program, VertexAttributeEnum.AMC_ATTRIBUTE_POSITION, "aPos");
  gl.bindAttribLocation(program, VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL, "aNormal");
  gl.bindAttribLocation(program, VertexAttributeEnum.AMC_ATTRIBUTE_TEXTURE, "aTexCoords");
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) == false) {
    var error = gl.getProgramInfoLog(program);
    if (error.length > 0) {
      console.log("Shader Linking error : " + error);
      uninitialize();
    }
  } else {
    console.log("Shader Linking Successfully");
  }

  ptL_modelMatrixUniform = gl.getUniformLocation(program, "model");
  ptL_viewMatrixUniform = gl.getUniformLocation(program, "view");
  ptL_projectionMatrixUniform = gl.getUniformLocation(program, "projection");
  ptL_viewPosUniform = gl.getUniformLocation(program, "viewPos");

  ptL_materialDiffuseUniform = gl.getUniformLocation(program, "material.diffuse");
  ptL_materialSpecularUniform = gl.getUniformLocation(program, "material.specular");
  ptL_materialShininessUniform = gl.getUniformLocation(program, "material.shininess");
  
  for (let i = 0; i < ptL_numPointLights; i++) {
    pointLightUniforms.push({
      position: gl.getUniformLocation(program, `pointLights[${i}].position`),
      ambient: gl.getUniformLocation(program, `pointLights[${i}].ambient`),
      diffuse: gl.getUniformLocation(program, `pointLights[${i}].diffuse`),
      specular: gl.getUniformLocation(program, `pointLights[${i}].specular`),
      constant: gl.getUniformLocation(program, `pointLights[${i}].constant`),
      linear: gl.getUniformLocation(program, `pointLights[${i}].linear`),
      quadratic: gl.getUniformLocation(program, `pointLights[${i}].quadratic`),
    });
  }
 

  var cubePosition = new Float32Array([
    // front
    1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,
    // right
    1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0,
    // back
    -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0,
    // left
    -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,
    // top
    1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
    // bottom
    1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0,
  ]);

  var cubeNormal = new Float32Array([
    // ront surace
    0.0,  0.0,  1.0, // top-right o ront
    0.0,  0.0,  1.0, // top-let o ront
    0.0,  0.0,  1.0, // bottom-let o ront
    0.0,  0.0,  1.0, // bottom-right o ront

    // right surace
    1.0,  0.0,  0.0, // top-right o right
    1.0,  0.0,  0.0, // top-let o right
    1.0,  0.0,  0.0, // bottom-let o right
    1.0,  0.0,  0.0, // bottom-right o right

    // back surace
    0.0,  0.0, -1.0, // top-right o back
    0.0,  0.0, -1.0, // top-let o back
    0.0,  0.0, -1.0, // bottom-let o back
    0.0,  0.0, -1.0, // bottom-right o back

    // let surace
   -1.0,  0.0,  0.0, // top-right o let
   -1.0,  0.0,  0.0, // top-let o let
   -1.0,  0.0,  0.0, // bottom-let o let
   -1.0,  0.0,  0.0, // bottom-right o let

   // top surace
   0.0,  1.0,  0.0, // top-right o top
   0.0,  1.0,  0.0, // top-let o top
   0.0,  1.0,  0.0, // bottom-let o top
   0.0,  1.0,  0.0, // bottom-right o top

   // bottom surace
   0.0, -1.0,  0.0, // top-right o bottom
   0.0, -1.0,  0.0, // top-let o bottom
   0.0, -1.0,  0.0, // bottom-let o bottom
   0.0, -1.0,  0.0, // bottom-right o bottom
  ])

  var cubeTexcoords = new Float32Array([
    // front
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // right
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // back
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // left
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // top
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // bottom
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
  ]);

  vao_Cube = gl.createVertexArray();
  gl.bindVertexArray(vao_Cube);

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

  vbo_CubeNormal = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_CubeNormal);
  gl.bufferData(gl.ARRAY_BUFFER, cubeNormal, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL,
    3,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.enableVertexAttribArray(VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL);

  vbo_Texcoord = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_Texcoord);
  gl.bufferData(gl.ARRAY_BUFFER, cubeTexcoords, gl.STATIC_DRAW);
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

  loadGLTexture();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  perspectiveProjectionMatrix = mat4.create();
}

function loadGLTexture() {
  texture_Kundali = gl.createTexture();
  texture_Kundali.image = new Image();
  texture_Kundali.image.src = "WoodenCrate.jpeg";
  texture_Kundali.image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture_Kundali);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      texture_Kundali.image
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };
}

function resize() {
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
    45.0 * (Math.PI / 180.0),
    parseFloat(canvas.width) / parseFloat(canvas.height),
    0.1,
    100.0
  );
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180.0;
}

// function display() {
//   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//   gl.useProgram(program);

//   var modelMatrix = mat4.create();
//   var viewMatrix = mat4.create();
//   var projectionMatrix = perspectiveProjectionMatrix;

//   var translateMatrix = mat4.create();
//   var rotateMatrix = mat4.create();

//   mat4.translate(translateMatrix, translateMatrix, [0.0, -0.5, -6.0]);

//   mat4.rotateX(rotateMatrix, rotateMatrix, degToRad(cangle));
//   mat4.rotateY(rotateMatrix, rotateMatrix, degToRad(cangle));
//   mat4.rotateZ(rotateMatrix, rotateMatrix, degToRad(cangle));

//   mat4.multiply(modelMatrix, modelMatrix, translateMatrix);
//   mat4.multiply(modelMatrix, modelMatrix, rotateMatrix);

//   gl.uniformMatrix4fv(ptL_modelMatrixUniform, false, modelMatrix);
//   gl.uniformMatrix4fv(ptL_viewMatrixUniform, false, viewMatrix);
//   gl.uniformMatrix4fv(ptL_projectionMatrixUniform, false, projectionMatrix);

//   var lightPositions = [
//     [0.0, 5.2, 0.0],
//     [5.5, 0.0, -2.0],
//     [-2.5, 0.0, -2.0],
//     [0.0, 0.0, -3.0]
//   ];

//   var lightColors = [
//     [0.8, 0.8, 0.8],
//     [0.8, 0.8, 0.8],
//     [0.8, 0.8, 0.8],
//     [0.8, 0.8, 0.8]
//   ];

//   for (let i = 0; i < ptL_numPointLights; i++) {
//     gl.uniform3fv(pointLightUniforms[i].position, lightPositions[i]);
//     gl.uniform3fv(pointLightUniforms[i].ambient, [0.05, 0.05, 0.05]);
//     gl.uniform3fv(pointLightUniforms[i].diffuse, lightColors[i]);
//     gl.uniform3fv(pointLightUniforms[i].specular, [1.0, 1.0, 1.0]);
//     gl.uniform1f(pointLightUniforms[i].constant, 1.0);
//     gl.uniform1f(pointLightUniforms[i].linear, 0.09);
//     gl.uniform1f(pointLightUniforms[i].quadratic, 0.032);
//   }

//   gl.uniform1f(ptL_materialDiffuseUniform, 0.0);
//   gl.uniform1f(ptL_materialSpecularUniform, 1.0);
//   gl.uniform1f(ptL_materialShininessUniform, 32.0);

//   gl.uniform3fv(ptL_viewPosUniform, [0.0, 0.0, 5.0]);

//   gl.activeTexture(gl.TEXTURE0);
//   gl.bindTexture(gl.TEXTURE_2D, texture_Kundali);

//   gl.bindVertexArray(vao_Cube);

//   gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
//   gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
//   gl.drawArrays(gl.TRIANGLE_FAN, 8, 4);
//   gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
//   gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
//   gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);

//   gl.bindVertexArray(null);

//   gl.useProgram(null);

//   update();

//   requestAnimationFrame(display, canvas);
// }

function display() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);

  var viewMatrix = mat4.create();
  var projectionMatrix = perspectiveProjectionMatrix;

  gl.uniformMatrix4fv(ptL_viewMatrixUniform, false, viewMatrix);
  gl.uniformMatrix4fv(ptL_projectionMatrixUniform, false, projectionMatrix);

  var lightPositions = [
    [0.0, 5.2, 0.0],
    [5.5, 0.0, -2.0],
    [-2.5, 0.0, -2.0],
    [0.0, 0.0, -3.0]
  ];

  var lightColors = [
    [0.8, 0.8, 0.8],
    [0.8, 0.8, 0.8],
    [0.8, 0.8, 0.8],
    [0.8, 0.8, 0.8]
  ];

  for (let i = 0; i < ptL_numPointLights; i++) {
    gl.uniform3fv(pointLightUniforms[i].position, lightPositions[i]);
    gl.uniform3fv(pointLightUniforms[i].ambient, [0.05, 0.05, 0.05]);
    gl.uniform3fv(pointLightUniforms[i].diffuse, lightColors[i]);
    gl.uniform3fv(pointLightUniforms[i].specular, [1.0, 1.0, 1.0]);
    gl.uniform1f(pointLightUniforms[i].constant, 1.0);
    gl.uniform1f(pointLightUniforms[i].linear, 0.09);
    gl.uniform1f(pointLightUniforms[i].quadratic, 0.032);
  }

  gl.uniform1f(ptL_materialDiffuseUniform, 0.0);
  gl.uniform1f(ptL_materialSpecularUniform, 1.0);
  gl.uniform1f(ptL_materialShininessUniform, 32.0);

  gl.uniform3fv(ptL_viewPosUniform, [0.0, 0.0, 5.0]);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture_Kundali);

  gl.bindVertexArray(vao_Cube);

  // Draw multiple cubes
  var cubePositions = [
    [0.0, 3.0, -12.0],
    [3.0, 0.0, -8.0],
    [-2.0, 0.0, -4.0],
    [3.0, 4.0, -16.0],
    [0.0, -3.0, -10.0],
    [1.0, 1.0, -20.0]
  ];

  for (let i = 0; i < cubePositions.length; i++) {
    var modelMatrix = mat4.create();
    var translateMatrix = mat4.create();
    var rotateMatrix = mat4.create();

    mat4.translate(translateMatrix, translateMatrix, cubePositions[i]);

    mat4.rotateX(rotateMatrix, rotateMatrix, degToRad(cangle));
    mat4.rotateY(rotateMatrix, rotateMatrix, degToRad(cangle));
    mat4.rotateZ(rotateMatrix, rotateMatrix, degToRad(cangle));

    mat4.multiply(modelMatrix, modelMatrix, translateMatrix);
    mat4.multiply(modelMatrix, modelMatrix, rotateMatrix);

    gl.uniformMatrix4fv(ptL_modelMatrixUniform, false, modelMatrix);

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

  if (vbo_CubeNormal) {
    gl.deleteBuffer(vbo_CubeNormal);
    vbo_CubeNormal = null;
  }

  if (vbo_Texcoord) {
    gl.deleteBuffer(vbo_Texcoord);
    vbo_Texcoord = null;
  }

  if (texture_Kundali) {
    gl.deleteTexture(texture_Kundali);
    texture_Kundali = null;
  }

  if (program) {
    gl.useProgram(program);

    var numAttachedShaders = gl.getProgramParameter(program, gl.ATTACHED_SHADERS);
    var shaderObjects = gl.getAttachedShaders(program);

    for (var i = 0; i < numAttachedShaders; i++) {
      gl.detachShader(program, shaderObjects[i]);
      gl.deleteShader(shaderObjects[i]);
      shaderObjects[i] = null;
    }

    gl.useProgram(null);
    gl.deleteProgram(program);
    program = null;
  }
}