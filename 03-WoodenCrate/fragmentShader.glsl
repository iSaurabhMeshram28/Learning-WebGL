#version 300 es
precision highp float;
in vec2 oTexcoord;
uniform sampler2D uTextureSampler;
out vec4 FragColor;
void main() {
    FragColor = texture(uTextureSampler, oTexcoord);
}
