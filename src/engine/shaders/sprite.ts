export const spriteVertexShader = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

out vec2 v_texCoord;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}`;

export const spriteFragmentShader = `#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_texture;
uniform vec4 u_color;

out vec4 fragColor;

void main() {
    vec4 texColor = texture(u_texture, v_texCoord);
    fragColor = texColor * u_color;
}`;

export const colorVertexShader = `#version 300 es
precision highp float;

in vec2 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 0.0, 1.0);
}`;

export const colorFragmentShader = `#version 300 es
precision highp float;

uniform vec4 u_color;

out vec4 fragColor;

void main() {
    fragColor = u_color;
}`;