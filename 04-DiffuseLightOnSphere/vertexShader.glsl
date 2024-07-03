#version 300 es
precision highp float;
in vec4 aPosition;
in vec3 aNormal;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionViewMatrix;
uniform vec3 uLd;
uniform vec3 uKd;
uniform vec4 uLightPosition;
uniform int ukeypressed;
out vec3 oDiffuseLight;
void main() {
    if (ukeypressed == 1) {
        vec4 iPosition = uModelViewMatrix * aPosition;
        mat3 normalMatrix = mat3(transpose(inverse(uModelViewMatrix)));
        vec3 n = normalize(normalMatrix * aNormal);
        vec3 s = normalize(vec3(uLightPosition - iPosition));
        oDiffuseLight = uLd * uKd * max(dot(s, n), 0.0);
    } else {
        oDiffuseLight = vec3(1.0, 1.0, 1.0);
    }
    gl_Position = uProjectionViewMatrix * uModelViewMatrix * aPosition;
}
