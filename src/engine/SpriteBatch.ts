import { Shader } from './Shader';
import { spriteVertexShader, spriteFragmentShader, colorVertexShader, colorFragmentShader } from './shaders/sprite';
import { Mat4 } from '../utils/math';

interface Vertex {
  x: number;
  y: number;
  u: number;
  v: number;
}

export class SpriteBatch {
  private gl: WebGL2RenderingContext;
  private spriteShader: Shader;
  private colorShader: Shader;
  
  private vertexBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;
  private vertices: Float32Array;
  private indices: Uint16Array;
  
  private maxSprites: number;
  private spriteCount: number = 0;
  private vertexIndex: number = 0;
  
  constructor(gl: WebGL2RenderingContext, maxSprites: number = 1000) {
    this.gl = gl;
    this.maxSprites = maxSprites;
    
    this.spriteShader = new Shader(gl, spriteVertexShader, spriteFragmentShader);
    this.colorShader = new Shader(gl, colorVertexShader, colorFragmentShader);
    
    this.vertices = new Float32Array(maxSprites * 4 * 4); // 4 vertices per sprite, 4 floats per vertex
    this.indices = new Uint16Array(maxSprites * 6); // 6 indices per sprite
    
    this.setupBuffers();
    this.setupIndices();
  }
  
  private setupBuffers(): void {
    const gl = this.gl;
    
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) throw new Error('Failed to create vertex buffer');
    this.vertexBuffer = vertexBuffer;
    
    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) throw new Error('Failed to create index buffer');
    this.indexBuffer = indexBuffer;
  }
  
  private setupIndices(): void {
    for (let i = 0; i < this.maxSprites; i++) {
      const offset = i * 6;
      const vertex = i * 4;
      
      this.indices[offset + 0] = vertex + 0;
      this.indices[offset + 1] = vertex + 1;
      this.indices[offset + 2] = vertex + 2;
      this.indices[offset + 3] = vertex + 0;
      this.indices[offset + 4] = vertex + 2;
      this.indices[offset + 5] = vertex + 3;
    }
  }
  
  public begin(projection: Mat4, view: Mat4): void {
    this.spriteCount = 0;
    this.vertexIndex = 0;
    
    this.spriteShader.use();
    this.spriteShader.setUniformMatrix4fv('u_projection', projection.data);
    this.spriteShader.setUniformMatrix4fv('u_view', view.data);
    this.spriteShader.setUniformMatrix4fv('u_model', Mat4.identity().data);
    this.spriteShader.setUniform4f('u_color', 1, 1, 1, 1);
  }
  
  public drawTexturedQuad(
    x: number, y: number, 
    width: number, height: number,
    u0: number = 0, v0: number = 0,
    u1: number = 1, v1: number = 1,
    rotation: number = 0
  ): void {
    if (this.spriteCount >= this.maxSprites) {
      this.flush();
    }
    
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    const x1 = -halfWidth;
    const y1 = -halfHeight;
    const x2 = halfWidth;
    const y2 = halfHeight;
    
    const positions = [
      x + x1 * cos - y1 * sin, y + x1 * sin + y1 * cos,
      x + x2 * cos - y1 * sin, y + x2 * sin + y1 * cos,
      x + x2 * cos - y2 * sin, y + x2 * sin + y2 * cos,
      x + x1 * cos - y2 * sin, y + x1 * sin + y2 * cos,
    ];
    
    const uvs = [
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1,
    ];
    
    for (let i = 0; i < 4; i++) {
      this.vertices[this.vertexIndex++] = positions[i * 2];
      this.vertices[this.vertexIndex++] = positions[i * 2 + 1];
      this.vertices[this.vertexIndex++] = uvs[i * 2];
      this.vertices[this.vertexIndex++] = uvs[i * 2 + 1];
    }
    
    this.spriteCount++;
  }
  
  public drawColoredQuad(
    x: number, y: number,
    width: number, height: number,
    r: number, g: number, b: number, a: number = 1,
    projection?: Mat4, view?: Mat4
  ): void {
    const gl = this.gl;
    
    this.flush();
    
    this.colorShader.use();
    this.colorShader.setUniform4f('u_color', r, g, b, a);
    
    if (projection && view) {
      this.colorShader.setUniformMatrix4fv('u_projection', projection.data);
      this.colorShader.setUniformMatrix4fv('u_view', view.data);
      this.colorShader.setUniformMatrix4fv('u_model', Mat4.identity().data);
    }
    
    const vertices = new Float32Array([
      x - width/2, y - height/2,
      x + width/2, y - height/2,
      x + width/2, y + height/2,
      x - width/2, y + height/2
    ]);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const posLoc = gl.getAttribLocation(this.colorShader.getProgram(), 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    
    gl.deleteBuffer(buffer);
  }
  
  public flush(): void {
    if (this.spriteCount === 0) return;
    
    const gl = this.gl;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.subarray(0, this.vertexIndex), gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices.subarray(0, this.spriteCount * 6), gl.DYNAMIC_DRAW);
    
    const stride = 4 * 4; // 4 floats per vertex * 4 bytes per float
    
    const posLoc = gl.getAttribLocation(this.spriteShader.getProgram(), 'a_position');
    if (posLoc !== -1) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
    }
    
    const texLoc = gl.getAttribLocation(this.spriteShader.getProgram(), 'a_texCoord');
    if (texLoc !== -1) {
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, stride, 8);
    }
    
    // Make sure texture unit 0 is set
    this.spriteShader.setUniform1i('u_texture', 0);
    
    gl.drawElements(gl.TRIANGLES, this.spriteCount * 6, gl.UNSIGNED_SHORT, 0);
    
    this.spriteCount = 0;
    this.vertexIndex = 0;
  }
  
  public end(): void {
    this.flush();
  }
  
  public getSpriteShader(): Shader {
    return this.spriteShader;
  }
}