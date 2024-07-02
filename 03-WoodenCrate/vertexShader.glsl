#version 300 es
in vec4 aPosition;
in vec2 aTexcoord;
out vec2 oTexcoord;
uniform mat4 uMVPMatrix;
void main() {
    gl_Position = uMVPMatrix * aPosition;
    oTexcoord = aTexcoord;
}
