export class Renderer {
  private gl: WebGL2RenderingContext;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;
    this.width = canvas.width;
    this.height = canvas.height;

    this.setupGL();
  }

  private setupGL(): void {
    const gl = this.gl;
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    this.resize(this.width, this.height);
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  public clear(r: number = 0.1, g: number = 0.1, b: number = 0.1, a: number = 1.0): void {
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  public getGL(): WebGL2RenderingContext {
    return this.gl;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }
}