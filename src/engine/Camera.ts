import { Vec2, Mat4 } from '../utils/math';

export class Camera {
  private position: Vec2;
  private zoom: number;
  private screenWidth: number;
  private screenHeight: number;
  
  constructor(screenWidth: number, screenHeight: number) {
    this.position = new Vec2(0, 0);
    this.zoom = 1;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }
  
  public setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }
  
  public getPosition(): Vec2 {
    return this.position;
  }
  
  public setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(5, zoom));
  }
  
  public getZoom(): number {
    return this.zoom;
  }
  
  public resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }
  
  public getProjectionMatrix(): Mat4 {
    const halfWidth = this.screenWidth / 2;
    const halfHeight = this.screenHeight / 2;
    return Mat4.orthographic(-halfWidth, halfWidth, halfHeight, -halfHeight, -1, 1);
  }
  
  public getViewMatrix(): Mat4 {
    const scale = Mat4.scale(this.zoom, this.zoom);
    const translate = Mat4.translate(-this.position.x, -this.position.y);
    return scale.multiply(translate);
  }
  
  public screenToWorld(screenX: number, screenY: number): Vec2 {
    const x = (screenX - this.screenWidth / 2) / this.zoom + this.position.x;
    const y = (screenY - this.screenHeight / 2) / this.zoom + this.position.y;
    return new Vec2(x, y);
  }
  
  public worldToScreen(worldX: number, worldY: number): Vec2 {
    const x = (worldX - this.position.x) * this.zoom + this.screenWidth / 2;
    const y = (worldY - this.position.y) * this.zoom + this.screenHeight / 2;
    return new Vec2(x, y);
  }
  
  public followTarget(targetX: number, targetY: number, smoothing: number = 0.1): void {
    this.position.x += (targetX - this.position.x) * smoothing;
    this.position.y += (targetY - this.position.y) * smoothing;
  }
}