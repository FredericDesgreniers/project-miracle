export class Texture {
  private gl: WebGL2RenderingContext;
  private texture: WebGLTexture;
  private width: number;
  private height: number;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    this.width = width;
    this.height = height;

    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture');
    }
    this.texture = texture;
  }

  public static fromImageData(gl: WebGL2RenderingContext, imageData: ImageData): Texture {
    const texture = new Texture(gl, imageData.width, imageData.height);
    texture.setData(new Uint8Array(imageData.data));
    return texture;
  }
  
  public static async load(gl: WebGL2RenderingContext, url: string, wrapMode: number = gl.CLAMP_TO_EDGE): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const texture = new Texture(gl, image.width, image.height);
        
        gl.bindTexture(gl.TEXTURE_2D, texture.texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        
        resolve(texture);
      };
      image.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };
      image.src = url;
    });
  }

  public static createSolid(gl: WebGL2RenderingContext, width: number, height: number, r: number, g: number, b: number, a: number = 255): Texture {
    const texture = new Texture(gl, width, height);
    const data = new Uint8Array(width * height * 4);
    
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 0] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = a;
    }
    
    texture.setData(data);
    return texture;
  }

  public static generateGrassTile(gl: WebGL2RenderingContext, size: number = 32): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base green color
    ctx.fillStyle = '#4a7c4e';
    ctx.fillRect(0, 0, size, size);

    // Add grass texture
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 2 + Math.random() * 4;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      
      ctx.strokeStyle = `rgba(${60 + Math.random() * 40}, ${100 + Math.random() * 55}, ${60}, 0.7)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }

  public static generateDirtTile(gl: WebGL2RenderingContext, size: number = 32): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base dirt color
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(0, 0, size, size);

    // Add texture
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = Math.random() * 3;
      
      ctx.fillStyle = `rgba(${100 + Math.random() * 55}, ${80 + Math.random() * 40}, 20, 0.5)`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }

  public static generateStoneTile(gl: WebGL2RenderingContext, size: number = 32): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base stone color
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, 0, size, size);

    // Add stone texture
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 5 + Math.random() * 10;
      const h = 5 + Math.random() * 10;
      
      ctx.fillStyle = `rgba(${80 + Math.random() * 40}, ${80 + Math.random() * 40}, ${80 + Math.random() * 40}, 0.5)`;
      ctx.fillRect(x, y, w, h);
    }

    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }

  public static generateWaterTile(gl: WebGL2RenderingContext, size: number = 32): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base water color
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2e86de');
    gradient.addColorStop(0.5, '#54a0ff');
    gradient.addColorStop(1, '#2e86de');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Add ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 5 + Math.random() * 10;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }

  public setData(data: Uint8Array): void {
    const gl = this.gl;
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data
    );
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  public bind(unit: number = 0): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }
  
  public dispose(): void {
    this.gl.deleteTexture(this.texture);
  }
}