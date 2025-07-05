import { Vec2 } from '../utils/math';

export enum Keys {
  W = 'KeyW',
  A = 'KeyA',
  S = 'KeyS',
  D = 'KeyD',
  Space = 'Space',
  Shift = 'ShiftLeft',
  E = 'KeyE',
  F = 'KeyF',
  Escape = 'Escape',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
}

export class Input {
  private keys: Map<string, boolean> = new Map();
  private previousKeys: Map<string, boolean> = new Map();
  private mousePosition: Vec2 = new Vec2();
  private mouseButtons: Map<number, boolean> = new Map();
  private previousMouseButtons: Map<number, boolean> = new Map();
  
  constructor(canvas: HTMLCanvasElement) {
    // Make canvas focusable
    canvas.tabIndex = 1;
    canvas.focus();
    this.setupEventListeners(canvas);
  }
  
  private setupEventListeners(canvas: HTMLCanvasElement): void {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      // Only prevent default for game keys
      if (e.code.startsWith('Arrow') || e.code.startsWith('Key') || e.code === 'Space' || e.code.startsWith('Digit')) {
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
      // Only prevent default for game keys
      if (e.code.startsWith('Arrow') || e.code.startsWith('Key') || e.code === 'Space' || e.code.startsWith('Digit')) {
        e.preventDefault();
      }
    });
    
    // Mouse events
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mousePosition.x = e.clientX - rect.left;
      this.mousePosition.y = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mousedown', (e) => {
      canvas.focus(); // Ensure canvas has focus when clicked
      this.mouseButtons.set(e.button, true);
      e.preventDefault();
    });
    
    canvas.addEventListener('mouseup', (e) => {
      this.mouseButtons.set(e.button, false);
      e.preventDefault();
    });
    
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // Handle focus loss
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseButtons.clear();
    });
  }
  
  public update(): void {
    // Update previous state
    this.previousKeys = new Map(this.keys);
    this.previousMouseButtons = new Map(this.mouseButtons);
    
  }
  
  public isKeyDown(key: string): boolean {
    return this.keys.get(key) || false;
  }
  
  public isKeyPressed(key: string): boolean {
    const current = this.keys.get(key) || false;
    const previous = this.previousKeys.get(key) || false;
    const pressed = current && !previous;
    return pressed;
  }
  
  public isKeyReleased(key: string): boolean {
    return !(this.keys.get(key) || false) && (this.previousKeys.get(key) || false);
  }
  
  public isMouseButtonDown(button: number): boolean {
    return this.mouseButtons.get(button) || false;
  }
  
  public isMouseButtonPressed(button: number): boolean {
    return (this.mouseButtons.get(button) || false) && !(this.previousMouseButtons.get(button) || false);
  }
  
  public isMouseButtonReleased(button: number): boolean {
    return !(this.mouseButtons.get(button) || false) && (this.previousMouseButtons.get(button) || false);
  }
  
  public getMousePosition(): Vec2 {
    return this.mousePosition;
  }
  
  public getMovementVector(): Vec2 {
    const movement = new Vec2();
    
    if (this.isKeyDown(Keys.W) || this.isKeyDown(Keys.ArrowUp)) movement.y -= 1;
    if (this.isKeyDown(Keys.S) || this.isKeyDown(Keys.ArrowDown)) movement.y += 1;
    if (this.isKeyDown(Keys.A) || this.isKeyDown(Keys.ArrowLeft)) movement.x -= 1;
    if (this.isKeyDown(Keys.D) || this.isKeyDown(Keys.ArrowRight)) movement.x += 1;
    
    if (movement.length() > 0) {
      return movement.normalize();
    }
    
    return movement;
  }
}