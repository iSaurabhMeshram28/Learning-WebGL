#version 300 es
precision highp float;
in vec3 oDiffuseLight;
uniform highp int ukeypressed;
out vec4 FragColor;
void main() {
    FragColor = vec4(oDiffuseLight, 1.0);
}
