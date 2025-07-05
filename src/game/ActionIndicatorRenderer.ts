import { SpriteBatch } from '../engine/SpriteBatch';
import { Texture } from '../engine/Texture';
import { Renderer } from '../engine/Renderer';
import { ActionIndicator } from './ActionSystem';
import { Camera } from '../engine/Camera';

export class ActionIndicatorRenderer {
  private renderer: Renderer;
  private indicatorTextures: Map<string, Texture> = new Map();
  
  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.generateTextures();
  }
  
  private generateTextures(): void {
    const gl = this.renderer.getGL();
    
    // Generate key prompt background
    this.indicatorTextures.set('bg', this.generateBackgroundTexture());
    
    // Generate key textures for common keys
    const keys = ['E', 'F', 'Click', '1', '2', '3', '4', '5'];
    keys.forEach(key => {
      this.indicatorTextures.set(`key_${key}`, this.generateKeyTexture(key));
    });
  }
  
  private generateBackgroundTexture(): Texture {
    const gl = this.renderer.getGL();
    const width = 120;
    const height = 40;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Semi-transparent dark background with rounded corners
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateKeyTexture(key: string): Texture {
    const gl = this.renderer.getGL();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Clear to transparent
    ctx.clearRect(0, 0, size, size);
    
    // Key background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(4, 4, size - 8, size - 8);
    
    // Key border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, size - 8, size - 8);
    
    // Key text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key, size / 2, size / 2);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  public render(
    spriteBatch: SpriteBatch, 
    indicator: ActionIndicator | null,
    camera: Camera
  ): void {
    if (!indicator || !indicator.isVisible()) return;
    
    const screenPos = camera.worldToScreen(indicator.position.x, indicator.position.y);
    const offsetY = -40; // Above the interactable
    
    // Calculate total width needed
    const actionSpacing = 35;
    const totalWidth = indicator.actions.length * actionSpacing;
    const startX = screenPos.x - totalWidth / 2;
    
    // Draw background
    const bgTexture = this.indicatorTextures.get('bg');
    if (bgTexture) {
      spriteBatch.flush();
      bgTexture.bind(0);
      spriteBatch.drawTexturedQuad(
        screenPos.x,
        screenPos.y + offsetY,
        Math.min(120, totalWidth + 20),
        40
      );
    }
    
    // Draw each action
    indicator.actions.forEach((action, index) => {
      const x = startX + index * actionSpacing + actionSpacing / 2;
      const y = screenPos.y + offsetY;
      
      // Draw key
      const keyTexture = this.indicatorTextures.get(`key_${action.key}`);
      if (keyTexture) {
        spriteBatch.flush();
        keyTexture.bind(0);
        spriteBatch.drawTexturedQuad(x, y, 24, 24);
      }
      
      // Draw icon if available (would need emoji rendering or icon textures)
      if (action.icon) {
        // For now, we'll skip emoji rendering as it requires more complex text rendering
        // In a real implementation, you'd either:
        // 1. Pre-render emoji to textures
        // 2. Use a text rendering library
        // 3. Use icon sprites instead of emoji
      }
    });
  }
  
  public dispose(): void {
    for (const [key, texture] of this.indicatorTextures) {
      texture.dispose();
    }
    this.indicatorTextures.clear();
  }
}