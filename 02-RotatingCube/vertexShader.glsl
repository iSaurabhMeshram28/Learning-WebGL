#version 300 es
in vec4 aPosition;
in vec4 aColor;
out vec4 oColor;
uniform mat4 uMVPMatrix;
void main() {
    gl_Position = uMVPMatrix * aPosition;
    oColor = aColor;
}
