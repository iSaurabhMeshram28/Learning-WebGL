#version 300 es
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
        }