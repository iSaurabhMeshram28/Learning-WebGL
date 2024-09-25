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

// WebGL related Variable
const VertexAttributeEnum = {
  AMC_ATTRIBUTE_POSITION: 0,
  AMC_ATTRIBUTE_TEXTURE: 1,
  AMC_ATTRIBUTE_NORMAL: 2,
};

var FBO_WIDTH = 512;
var FBO_HEIGHT = 512;

// Cube Related Variable
var ShaderProgramObject_Cube = null;
var vao_Cube = null;
var vbo_CubePosition = null;
var vbo_CubeTexcoord = null;
var mvpMatrixUniform_Cube = 0;
var textureSamplerUniform_Cube = 0;
var perspectiveProjectionMatrix_Cube = 0;
var cAngle = 0.0;

// Sphere Related Variable
var ShaderProgramObject_Sphere = null;
var modelMatrixUniform_Sphere;
var projectionMatrixUniform_Sphere;
var viewMatrixUniform_Sphere;

var lightDiffuseUniform = new Array(3);
var lightAmbientUniform = new Array(3);
var lightSpecularUniform = new Array(3);
var lightPositionUniform = new Array(3);
var materialAmbientUniform = 0;
var materialDiffuseUniform = 0;
var materialSpecularUniform = 0;
var materialShininessUniform = 0;
var keyPressedUniform = 0;

var bLightingEnabled = false;
var sphere = null;

var materialAmbient = new Float32Array([0.0, 0.0, 0.0]);
var materialDiffuse = new Float32Array([1.0, 1.0, 1.0]);
var materialSpecular = new Float32Array([1.0, 1.0, 1.0]);
var materialShininess = 128.0;

var lights = [
  {
    ambient: [0.0, 0.0, 0.0],
    diffuse: [1.0, 0.0, 0.0],
    specular: [1.0, 0.0, 0.0],
    position: [0.0, 0.0, 0.0, 1.0],
  },
  {
    ambient: [0.0, 0.0, 0.0],
    diffuse: [0.0, 1.0, 0.0],
    specular: [0.0, 1.0, 0.0],
    position: [0.0, 0.0, 0.0, 1.0],
  },
  {
    ambient: [0.0, 0.0, 0.0],
    diffuse: [0.0, 0.0, 1.0],
    specular: [0.0, 0.0, 1.0],
    position: [0.0, 0.0, 0.0, 1.0],
  },
];

var perspectiveProjectionMatrix_Sphere = 0;

// FBO Related Variable
var Fbo = null;
var Rbo = null;
var texture_Fbo = null;
var bFboResult = false;

var lightAngleZero = 0.0;
var lightAngleOne = 0.0;
var lightAngleTwo = 0.0;

// Main function
function main() {
  // Get Canvas
  canvas = document.getElementById("ssm");
  if (!canvas) {
    console.log("Getting Canvas Failed\n");
    return;
  }

  console.log("Getting canvas Succeeded");

  // Set canvas width and height for future use
  canvas_original_width = canvas.width;
  canvas_original_height = canvas.height;

  // Register for keyboard events
  window.addEventListener("keydown", keyDown, false);

  // Register for mouse events
  window.addEventListener("click", mouseDown, false);

  // event listener for resize
  window.addEventListener("resize", resize_Cube, false);

  initialize_Cube();
  resize_Cube();
  display_Cube();
}

function keyDown(event) {
  switch (event.keyCode) {
    case 81: // 'Q'
    case 113: // 'q'
      uninitialize_Sphere();
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

function mouseDown() {
  // No specific mouse actions, keeping it as a placeholder
}

function toggleFullScreen() {
  var fullScreen_Element =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;

  // If not full screen
  if (!fullScreen_Element) {
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

function initialize_Cube() {
  // Get context from canvas
  gl = canvas.getContext("webgl2");
  if (!gl) {
    console.log("Getting WebGL2 context Failed\n");
    return;
  }
  console.log("Getting WebGL2 context Succeeded");

  // Set WebGL2 context's viewWidth and viewHeight properties
  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;

  // Vertex shader
  var vertexShaderSourceCode =
    "#version 300 es\n" +
    "in vec4 aPosition;" +
    "in vec2 aTexcoord;" +
    "out vec2 oTexcoord;" +
    "uniform mat4 uMVPMatrix;" +
    "void main()" +
    "{" +
    "gl_Position= uMVPMatrix * aPosition;" +
    "oTexcoord=aTexcoord;" +
    "}";

  var vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
  gl.compileShader(vertexShaderObject);

  if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
    console.error("Vertex Shader Compilation error : ", gl.getShaderInfoLog(vertexShaderObject));
    uninitialize_Cube();
    return;
  }
  console.log("Vertex Shader Compiled Successfully");

  var fragmentShaderSourceCode =
    "#version 300 es\n" +
    "precision highp float;" +
    "in vec2 oTexcoord;" +
    "uniform sampler2D uTextureSampler;" +
    "out vec4 FragColor;" +
    "void main()" +
    "{" +
    "FragColor=texture(uTextureSampler, oTexcoord);" +
    "}";

  var fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShaderObject, fragmentShaderSourceCode);
  gl.compileShader(fragmentShaderObject);

  if (!gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS)) {
    console.error("Fragment Shader Compilation error : ", gl.getShaderInfoLog(fragmentShaderObject));
    uninitialize_Cube();
    return;
  }
  console.log("Fragment Shader Compiled Successfully");

  // Shader Program
  ShaderProgramObject_Cube = gl.createProgram();
  gl.attachShader(ShaderProgramObject_Cube, vertexShaderObject);
  gl.attachShader(ShaderProgramObject_Cube, fragmentShaderObject);
  gl.bindAttribLocation(
    ShaderProgramObject_Cube,
    VertexAttributeEnum.AMC_ATTRIBUTE_POSITION,
    "aPosition"
  );
  gl.bindAttribLocation(
    ShaderProgramObject_Cube,
    VertexAttributeEnum.AMC_ATTRIBUTE_TEXTURE,
    "aTexcoord"
  );
  gl.linkProgram(ShaderProgramObject_Cube);

  if (!gl.getProgramParameter(ShaderProgramObject_Cube, gl.LINK_STATUS)) {
    console.error("Shader Linking error : ", gl.getProgramInfoLog(ShaderProgramObject_Cube));
    uninitialize_Cube();
    return;
  }
  console.log("Shader Linking Successfully");

  mvpMatrixUniform_Cube = gl.getUniformLocation(ShaderProgramObject_Cube, "uMVPMatrix");
  textureSamplerUniform_Cube = gl.getUniformLocation(
    ShaderProgramObject_Cube,
    "uTextureSampler"
  );

  // Geometry attribute
  var cubePosition = new Float32Array([
    // front
    1.0, 1.0, 1.0, // top-right of front
    -1.0, 1.0, 1.0, // top-left of front
    -1.0, -1.0, 1.0, // bottom-left of front
    1.0, -1.0, 1.0, // bottom-right of front

    // right
    1.0, 1.0, -1.0, // top-right of right
    1.0, 1.0, 1.0, // top-left of right
    1.0, -1.0, 1.0, // bottom-left of right
    1.0, -1.0, -1.0, // bottom-right of right

    // back
    1.0, 1.0, -1.0, // top-right of back
    -1.0, 1.0, -1.0, // top-left of back
    -1.0, -1.0, -1.0, // bottom-left of back
    1.0, -1.0, -1.0, // bottom-right of back

    // left
    -1.0, 1.0, 1.0, // top-right of left
    -1.0, 1.0, -1.0, // top-left of left
    -1.0, -1.0, -1.0, // bottom-left of left
    -1.0, -1.0, 1.0, // bottom-right of left

    // top
    1.0, 1.0, -1.0, // top-right of top
    -1.0, 1.0, -1.0, // top-left of top
    -1.0, 1.0, 1.0, // bottom-left of top
    1.0, 1.0, 1.0, // bottom-right of top

    // bottom
    1.0, -1.0, 1.0, // top-right of bottom
    -1.0, -1.0, 1.0, // top-left of bottom
    -1.0, -1.0, -1.0, // bottom-left of bottom
    1.0, -1.0, -1.0, // bottom-right of bottom
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
    1.0, 0.0, // bottom-right of bottom
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

  // VBO for Cube Texcoord
  vbo_CubeTexcoord = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_CubeTexcoord);
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

  // Depth initialization
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Set clearColor
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  resize_Cube();

  if (createFbo(FBO_WIDTH, FBO_HEIGHT)) {
    bFboResult = initialize_Sphere();
  }

  // Initialize Cube projection matrix
  perspectiveProjectionMatrix_Cube = mat4.create();
}

function initialize_Sphere() {
  // Vertex shader
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
        uniform vec4 uLightPosition[3]; 
        uniform int ukeypressed; 
        out vec3 oTransformedNormals; 
        out vec3 oLightDirection[3]; 
        out vec3 oViewerVector; 
        void main() 
        { 
        if(ukeypressed == 1) 
        { 
        vec4 iCoordinates = uViewMatrix * uModelMatrix * aPosition; 
        oTransformedNormals = mat3(uViewMatrix * uModelMatrix) * aNormal; 
        oViewerVector = -iCoordinates.xyz; 
        for(int i = 0; i<3; i++) 
        { 
        oLightDirection[i] = vec3(uLightPosition[i] - iCoordinates); 
        } 
        } 
        else 
        { 
        oTransformedNormals = vec3(0.0, 0.0, 0.0); 
        oLightDirection[0] = vec3(0.0, 0.0, 0.0); 
        oLightDirection[1] = vec3(0.0, 0.0, 0.0); 
        oLightDirection[2] = vec3(0.0, 0.0, 0.0); 
        oViewerVector = vec3(0.0, 0.0, 0.0); 
        } 
        gl_Position = uProjectionViewMatrix * uViewMatrix * uModelMatrix * aPosition; 
        }`;

  var vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShaderObject, vertexShaderSourceCode);
  gl.compileShader(vertexShaderObject);

  if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
    console.error("Vertex Shader Compilation error : ", gl.getShaderInfoLog(vertexShaderObject));
    uninitialize_Sphere();
    return false;
  }
  console.log("Vertex Shader Compiled Successfully");

  var fragmentShaderSourceCode = `#version 300 es
    precision highp float;
    precision highp int;
         in vec4 oColor; 
        in vec3 oTransformedNormals; 
        in vec3 oLightDirection[3]; 
        in vec3 oViewerVector; 
        uniform vec3 uLightAmbient[3]; 
        uniform vec3 uLightDiffuse[3]; 
        uniform vec3 uLightSpecular[3]; 
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
        vec3 normalisedLightDirection[3]; 
        vec3 ambientLight[3]; 
        vec3 diffusedLight[3]; 
        vec3 reflectionVector[3]; 
        vec3 specularLight[3]; 
        vec3 normalisedTransformedNormal = normalize(oTransformedNormals); 
        vec3 normalisedViewerVector = normalize(oViewerVector); 
        for(int i = 0; i<3; i++) 
        { 
        normalisedLightDirection[i] = normalize(oLightDirection[i]); 
        ambientLight[i] = uLightAmbient[i] * uMaterialAmbient; 
        diffusedLight[i] = uLightDiffuse[i] * uMaterialDiffuse * max(dot(normalisedLightDirection[i], normalisedTransformedNormal), 0.0); 
        reflectionVector[i] = reflect(-normalisedLightDirection[i], normalisedTransformedNormal); 
        specularLight[i] = uLightSpecular[i] * uMaterialSpecular * pow(max(dot(reflectionVector[i], normalisedViewerVector), 0.0), uMaterialShininess); 
        Phong_ADS_Light = Phong_ADS_Light + ambientLight[i] + diffusedLight[i] + specularLight[i]; 
        } 
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
    console.error("Fragment Shader Compilation error : ", gl.getShaderInfoLog(fragmentShaderObject));
    uninitialize_Sphere();
    return false;
  }
  console.log("Fragment Shader Compiled Successfully");

  // Shader Program
  ShaderProgramObject_Sphere = gl.createProgram();
  gl.attachShader(ShaderProgramObject_Sphere, vertexShaderObject);
  gl.attachShader(ShaderProgramObject_Sphere, fragmentShaderObject);
  gl.bindAttribLocation(
    ShaderProgramObject_Sphere,
    VertexAttributeEnum.AMC_ATTRIBUTE_POSITION,
    "aPosition"
  );
  gl.bindAttribLocation(
    ShaderProgramObject_Sphere,
    VertexAttributeEnum.AMC_ATTRIBUTE_NORMAL,
    "aNormal"
  );
  gl.linkProgram(ShaderProgramObject_Sphere);

  if (!gl.getProgramParameter(ShaderProgramObject_Sphere, gl.LINK_STATUS)) {
    console.error("Shader Linking error : ", gl.getProgramInfoLog(ShaderProgramObject_Sphere));
    uninitialize_Sphere();
    return false;
  }
  console.log("Shader Linking Successfully");

  modelMatrixUniform_Sphere = gl.getUniformLocation(
    ShaderProgramObject_Sphere,
    "uModelMatrix"
  );
  viewMatrixUniform_Sphere = gl.getUniformLocation(ShaderProgramObject_Sphere, "uViewMatrix");
  projectionMatrixUniform_Sphere = gl.getUniformLocation(
    ShaderProgramObject_Sphere,
    "uProjectionViewMatrix"
  );

  for (let i = 0; i < 3; i++) {
    lightAmbientUniform[i] = gl.getUniformLocation(
      ShaderProgramObject_Sphere,
      `uLightAmbient[${i}]`
    );
    lightDiffuseUniform[i] = gl.getUniformLocation(
      ShaderProgramObject_Sphere,
      `uLightDiffuse[${i}]`
    );
    lightSpecularUniform[i] = gl.getUniformLocation(
      ShaderProgramObject_Sphere,
      `uLightSpecular[${i}]`
    );
    lightPositionUniform[i] = gl.getUniformLocation(
      ShaderProgramObject_Sphere,
      `uLightPosition[${i}]`
    );
  }

  materialAmbientUniform = gl.getUniformLocation(
    ShaderProgramObject_Sphere,
    "uMaterialAmbient"
  );
  materialDiffuseUniform = gl.getUniformLocation(
    ShaderProgramObject_Sphere,
    "uMaterialDiffuse"
  );
  materialSpecularUniform = gl.getUniformLocation(
    ShaderProgramObject_Sphere,
    "uMaterialSpecular"
  );
  materialShininessUniform = gl.getUniformLocation(
    ShaderProgramObject_Sphere,
    "uMaterialShininess"
  );

  keyPressedUniform = gl.getUniformLocation(ShaderProgramObject_Sphere, "ukeypressed");

  sphere = new Mesh();
  makeSphere(sphere, 1.0, 30, 30);

  // Depth initialization
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Set clearColor
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  resize_Sphere();

  // Initialize Sphere projection matrix
  perspectiveProjectionMatrix_Sphere = mat4.create();

  return true;
}

function createFbo(textureWidth, textureHeight) {
  // Check capacity of renderBuffer
  var maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

  if (
    maxRenderBufferSize < textureWidth ||
    maxRenderBufferSize < textureHeight
  ) {
    console.log("Texture size overflow");
    return false;
  }

  // Create Custom FrameBuffer
  Fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, Fbo);

  // Create Texture for Fbo in which we are going to render to Sphere
  texture_Fbo = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture_Fbo);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB,
    textureWidth,
    textureHeight,
    0,
    gl.RGB,
    gl.UNSIGNED_SHORT_5_6_5,
    null
  );

  // Attach texture
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture_Fbo,
    0
  );

  // Now create renderBuffer to hold Depth of Custom Fbo
  Rbo = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, Rbo);

  // Set the Storage of render buffer of texture size
  gl.renderbufferStorage(
    gl.RENDERBUFFER,
    gl.DEPTH_COMPONENT16,
    textureWidth,
    textureHeight
  );

  // Attach above depth related render buffer to Fbo
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    Rbo
  );

  // Check the Framebuffer status whether successful or not
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.log("Framebuffer status is not complete");
    return false;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return true;
}

function resize_Cube() {
  if (canvas.height === 0) canvas.height = 1;

  if (bFullScreen) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    canvas.width = canvas_original_width;
    canvas.height = canvas_original_height;
  }

  // Set viewport
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Set Perspective Projection
  mat4.perspective(
    perspectiveProjectionMatrix_Cube,
    45.0,
    canvas.width / canvas.height,
    0.1,
    100.0
  );
}

function resize_Sphere() {
  if (FBO_HEIGHT === 0) FBO_HEIGHT = 1;

  // Set viewport
  gl.viewport(0, 0, FBO_WIDTH, FBO_HEIGHT);

  // Set Perspective Projection
  mat4.perspective(
    perspectiveProjectionMatrix_Sphere,
    45.0,
    FBO_WIDTH / FBO_HEIGHT,
    0.1,
    100.0
  );
}

function display_Cube() {
  if (bFboResult && bLightingEnabled) {
    display_Sphere();
    update_Sphere();
  }

  resize_Cube();

  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  // Clear buffers
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(ShaderProgramObject_Cube);

  // Transformation for Cube
  var modelViewMatrix = mat4.create();
  var modelViewProjectionMatrix = mat4.create();
  var translationMatrix = mat4.create();
  var rotationMatrixX = mat4.create();
  var rotationMatrixY = mat4.create();
  var rotationMatrixZ = mat4.create();
  var rotationMatrix = mat4.create();
  var scaleMatrix = mat4.create();

  mat4.identity(modelViewMatrix);
  mat4.identity(modelViewProjectionMatrix);
  mat4.identity(translationMatrix);
  mat4.identity(rotationMatrix);
  mat4.identity(scaleMatrix);

  mat4.translate(translationMatrix, translationMatrix, [0.0, 0.0, -6.0]);
  mat4.rotateX(rotationMatrixX, rotationMatrixX, glMatrix.toRadian(cAngle));
  mat4.rotateY(rotationMatrixY, rotationMatrixY, glMatrix.toRadian(cAngle));
  mat4.rotateZ(rotationMatrixZ, rotationMatrixZ, glMatrix.toRadian(cAngle));
  mat4.multiply(rotationMatrix, rotationMatrixX, rotationMatrixY);
  mat4.multiply(rotationMatrix, rotationMatrix, rotationMatrixZ);
  mat4.scale(scaleMatrix, scaleMatrix, [0.75, 0.75, 0.75]);
  mat4.multiply(modelViewMatrix, translationMatrix, scaleMatrix);
  mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
  mat4.multiply(
    modelViewProjectionMatrix,
    perspectiveProjectionMatrix_Cube,
    modelViewMatrix
  );

  gl.uniformMatrix4fv(mvpMatrixUniform_Cube, false, modelViewProjectionMatrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture_Fbo);
  gl.uniform1i(textureSamplerUniform_Cube, 0);

  gl.bindVertexArray(vao_Cube);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 8, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 12, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 16, 4);
  gl.drawArrays(gl.TRIANGLE_FAN, 20, 4);

  gl.bindVertexArray(null);

  gl.useProgram(null);

  update_Cube();

  // Double buffering
  requestAnimationFrame(display_Cube, canvas);
}

function display_Sphere() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, Fbo);

  resize_Sphere();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear buffers
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(ShaderProgramObject_Sphere);

  var modelMatrix = mat4.create();
  var viewMatrix = mat4.create();

  mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -3.0]);

  gl.uniformMatrix4fv(modelMatrixUniform_Sphere, false, modelMatrix);
  gl.uniformMatrix4fv(
    projectionMatrixUniform_Sphere,
    false,
    perspectiveProjectionMatrix_Sphere
  );
  gl.uniformMatrix4fv(viewMatrixUniform_Sphere, false, viewMatrix);

  if (bLightingEnabled == true) {
    gl.uniform1i(keyPressedUniform, 1);

    for (let i = 0; i < 3; i++) {
      gl.uniform3fv(lightAmbientUniform[i], lights[i].ambient);
      gl.uniform3fv(lightDiffuseUniform[i], lights[i].diffuse);
      gl.uniform3fv(lightSpecularUniform[i], lights[i].specular);
      gl.uniform4fv(lightPositionUniform[i], lights[i].position);
    }

    gl.uniform3fv(materialAmbientUniform, materialAmbient);
    gl.uniform3fv(materialDiffuseUniform, materialDiffuse);
    gl.uniform3fv(materialSpecularUniform, materialSpecular);
    gl.uniform1f(materialShininessUniform, materialShininess);
  } else {
    gl.uniform1i(keyPressedUniform, 0);

    // Reset lighting uniforms to default values
    for (let i = 0; i < 3; i++) {
      gl.uniform3fv(lightAmbientUniform[i], [0.0, 0.0, 0.0]);
      gl.uniform3fv(lightDiffuseUniform[i], [0.0, 0.0, 0.0]);
      gl.uniform3fv(lightSpecularUniform[i], [0.0, 0.0, 0.0]);
      gl.uniform4fv(lightPositionUniform[i], [0.0, 0.0, 0.0, 1.0]);
    }
  }

  sphere.draw();

  gl.useProgram(null);

  //update_Sphere();

  // Unbind the framebuffer to revert back to the default framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function update_Cube() {
  cAngle = (cAngle - 0.2) % 360.0;
}

function update_Sphere() {
  if (bLightingEnabled) {
    lights[0].position[0] = 0.0;
    lights[0].position[1] = 5.0 * Math.sin(lightAngleZero);
    lights[0].position[2] = Math.cos(lightAngleZero);
    lights[0].position[3] = 1.0;

    lightAngleZero = (lightAngleZero + 0.02) % (2 * Math.PI);
  }

  if (bLightingEnabled) {
    lights[1].position[0] = Math.cos(lightAngleZero);
    lights[1].position[1] = 0.0;
    lights[1].position[2] = 5.0 * Math.sin(lightAngleZero);
    lights[1].position[3] = 1.0;

    lightAngleOne = (lightAngleOne + 0.02) % (2 * Math.PI);
  }

  if (bLightingEnabled) {
    lights[2].position[0] = 5.0 * Math.sin(lightAngleZero);
    lights[2].position[1] = Math.cos(lightAngleZero);
    lights[2].position[2] = 0.0;
    lights[2].position[3] = 1.0;

    lightAngleTwo = (lightAngleTwo + 0.02) % (2 * Math.PI);
  }
}

function uninitialize_Cube() {
  if (ShaderProgramObject_Cube) {
    gl.useProgram(ShaderProgramObject_Cube);
    var shaderObjects = gl.getAttachedShaders(ShaderProgramObject_Cube);
    if (shaderObjects && shaderObjects.length > 0) {
      for (let i = 0; i < shaderObjects.length; i++) {
        gl.detachShader(ShaderProgramObject_Cube, shaderObjects[i]);
        gl.deleteShader(shaderObjects[i]);
        shaderObjects[i] = null;
      }
    }

    gl.useProgram(null);
    gl.deleteProgram(ShaderProgramObject_Cube);
    ShaderProgramObject_Cube = null;
  }

  if (vbo_CubePosition) {
    gl.deleteBuffer(vbo_CubePosition);
    vbo_CubePosition = null;
  }

  if (vao_Cube) {
    gl.deleteVertexArray(vao_Cube);
    vao_Cube = null;
  }
}

function uninitialize_Sphere() {
  if (ShaderProgramObject_Sphere) {
    gl.useProgram(ShaderProgramObject_Sphere);
    var shaderObjects = gl.getAttachedShaders(ShaderProgramObject_Sphere);
    if (shaderObjects && shaderObjects.length > 0) {
      for (let i = 0; i < shaderObjects.length; i++) {
        gl.detachShader(ShaderProgramObject_Sphere, shaderObjects[i]);
        gl.deleteShader(shaderObjects[i]);
        shaderObjects[i] = null;
      }
    }

    gl.useProgram(null);
    gl.deleteProgram(ShaderProgramObject_Sphere);
    ShaderProgramObject_Sphere = null;
  }
}

