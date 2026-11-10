// Every temporal term uses this closed circle: values AND velocity match at 25s.
export const LIGHT_CYCLE_MS = 25000;
export function lightPhase(elapsed) {
  const angle = (elapsed % LIGHT_CYCLE_MS) / LIGHT_CYCLE_MS * Math.PI * 2;
  return [Math.cos(angle), Math.sin(angle)];
}

const vertexSource = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;
const fragmentSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_aspect;
uniform vec2 u_phase;
uniform vec3 u_ink;
uniform vec3 u_gold;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float x = (uv.x - 0.5) * min(u_aspect, 2.6);
  // Broad, softly edged diagonal folds, gently distorted along a closed path.
  float bend = 0.11 * sin(uv.y * 4.0 + x * 1.3 + u_phase.x * 0.7)
             + 0.09 * u_phase.y + 0.035 * u_phase.x * cos(x * 3.0);
  float field = (x + uv.y * 0.85 + bend) * 8.6;
  float folds = 0.5 + 0.5 * sin(field + 0.6 * sin(uv.y * 3.0 + u_phase.y));
  float ribbons = smoothstep(0.12, 0.88, folds);
  float sheen = pow(0.5 + 0.5 * sin(field - 0.65), 5.0);
  float lower = pow(1.0 - uv.y, 1.15) * (1.0 - smoothstep(0.48, 0.9, uv.y));
  float light = lower * (0.10 + ribbons * 0.72 + sheen * 0.22);
  // The black upper field and restrained center protect the stationary HTML.
  gl_FragColor = vec4(mix(u_ink, u_gold, clamp(light, 0.0, 1.0)), 1.0);
}
`;

export function createLightRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'low-power',
  });
  if (!gl) throw Error('WebGL unavailable');
  let program, buffer;
  const shaders = [];
  function destroy() {
    if (gl.isContextLost()) return;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
  }
  try {
    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw Error('Shader allocation failed');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Shader compilation failed');
      return shader;
    }
    program = gl.createProgram();
    if (!program) throw Error('Program allocation failed');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Shader linking failed');
    buffer = gl.createBuffer();
    if (!buffer) throw Error('Buffer allocation failed');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(['resolution', 'aspect', 'phase', 'ink', 'gold']
      .map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
    gl.uniform3f(uniforms.ink, 16 / 255, 16 / 255, 17 / 255);
    gl.uniform3f(uniforms.gold, 222 / 255, 177 / 255, 35 / 255);
    let cssWidth = 1, cssHeight = 1;
    return {
      resize(width, height, dpr) {
        cssWidth = Math.max(1, width); cssHeight = Math.max(1, height);
        // Also bound total pixels on ultrawide screens; no per-frame layout reads.
        const scale = Math.min(dpr || 1, 1.5, Math.sqrt(1600000 / (cssWidth * cssHeight)));
        const w = Math.max(1, Math.round(cssWidth * scale));
        const h = Math.max(1, Math.round(cssHeight * scale));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
      },
      draw(elapsed) {
        if (gl.isContextLost()) return;
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.aspect, cssWidth / cssHeight);
        gl.uniform2f(uniforms.phase, ...lightPhase(elapsed));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy,
    };
  } catch (error) { destroy(); throw error; }
}
