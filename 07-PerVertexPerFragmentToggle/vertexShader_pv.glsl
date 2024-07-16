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
        uniform vec3 uLightAmbient; 
        uniform vec3 uLightDiffuse; 
        uniform vec3 uLightSpecular; 
        uniform vec4 uLightPosition; 
        uniform vec3 uMaterialAmbient; 
        uniform vec3 uMaterialDiffuse; 
        uniform vec3 uMaterialSpecular; 
        uniform float uMaterialShininess; 
        uniform int ukeypressed; 
        out vec3 oPhong_ADS_Light; 
        void main() 
        { 
        if(ukeypressed == 1) 
        { 
        vec4 iCoordinates = uViewMatrix * uModelMatrix * aPosition; 
        vec3 transformedNormals = normalize(mat3(uViewMatrix * uModelMatrix) * aNormal); 
        vec3 lightDirection = normalize(vec3(uLightPosition - iCoordinates)); 
        vec3 reflectionVector = reflect(-lightDirection, transformedNormals); 
        vec3 viewerVector = normalize(-iCoordinates.xyz); 
        vec3 ambientLight = uLightAmbient * uMaterialAmbient; 
        vec3 DiffusedLight = uLightDiffuse * uMaterialDiffuse * max(dot(lightDirection, transformedNormals), 0.0); 
        vec3 specularLight = uLightSpecular * uMaterialSpecular * pow(max(dot(reflectionVector, viewerVector), 0.0), uMaterialShininess); 
        oPhong_ADS_Light = ambientLight + DiffusedLight + specularLight; 
        } 
        else 
        { 
        oPhong_ADS_Light = vec3(0.0, 0.0, 0.0); 
        } 
        gl_Position = uProjectionViewMatrix * uViewMatrix * uModelMatrix * aPosition; 
        }