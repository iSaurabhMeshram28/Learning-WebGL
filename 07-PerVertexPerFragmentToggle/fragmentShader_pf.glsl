#version 300 es
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
        }