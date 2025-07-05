import { SpriteBatch } from '../engine/SpriteBatch';
import { Texture } from '../engine/Texture';
import { Renderer } from '../engine/Renderer';
import { Vec2 } from '../utils/math';

export interface TileAction {
  position: Vec2; // Tile position in world coordinates
  key: string; // Key to display (e.g., "E", "F", "Click")
}

export class TileActionRenderer {
  private renderer: Renderer;
  private keyTextures: Map<string, Texture> = new Map();
  private whiteTexture: Texture;
  
  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.whiteTexture = this.generateWhiteTexture();
    this.generateKeyTextures();
  }
  
  private generateWhiteTexture(): Texture {
    const gl = this.renderer.getGL();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateKeyTextures(): void {
    const keys = ['E', 'F', 'C']; // C for Click
    keys.forEach(key => {
      this.keyTextures.set(key, this.generateKeyBadgeTexture(key));
    });
  }
  
  private generateKeyBadgeTexture(key: string): Texture {
    const gl = this.renderer.getGL();
    const size = 20;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Clear to transparent
    ctx.clearRect(0, 0, size, size);
    
    // Dark background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    ctx.fill();
    
    // White border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Key text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key, size/2, size/2);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  public renderTileActions(spriteBatch: SpriteBatch, actions: TileAction[]): void {
    actions.forEach(action => {
      const texture = this.keyTextures.get(action.key === 'Click' ? 'C' : action.key);
      if (texture) {
        spriteBatch.flush();
        texture.bind(0);
        // Render in the corner of the tile
        const offsetX = 10;
        const offsetY = -10;
        spriteBatch.drawTexturedQuad(
          action.position.x + offsetX,
          action.position.y + offsetY,
          20,
          20
        );
      }
    });
  }
  
  public dispose(): void {
    for (const [key, texture] of this.keyTextures) {
      texture.dispose();
    }
    this.keyTextures.clear();
    this.whiteTexture.dispose();
  }
}