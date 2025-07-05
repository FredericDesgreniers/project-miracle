export class Shader {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();

  constructor(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
    this.gl = gl;
    
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    this.program = this.createProgram(vertexShader, fragmentShader);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }

    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking error: ${info}`);
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }

  public use(): void {
    this.gl.useProgram(this.program);
  }

  public getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.uniformLocations.has(name)) {
      const location = this.gl.getUniformLocation(this.program, name);
      if (!location) {
        console.warn(`Uniform '${name}' not found`);
        return null;
      }
      this.uniformLocations.set(name, location);
    }
    return this.uniformLocations.get(name)!;
  }

  public setUniform1i(name: string, value: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform1i(location, value);
  }

  public setUniform1f(name: string, value: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform1f(location, value);
  }

  public setUniform2f(name: string, x: number, y: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform2f(location, x, y);
  }

  public setUniform3f(name: string, x: number, y: number, z: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform3f(location, x, y, z);
  }

  public setUniform4f(name: string, x: number, y: number, z: number, w: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniform4f(location, x, y, z, w);
  }

  public setUniformMatrix4fv(name: string, matrix: Float32Array): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl.uniformMatrix4fv(location, false, matrix);
  }

  public getProgram(): WebGLProgram {
    return this.program;
  }
}