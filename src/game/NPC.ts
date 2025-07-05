import { Vec2 } from '../utils/math';

export interface NPCConfig {
  id: string;
  name: string;
  position: Vec2;
  type: 'shopkeeper' | 'villager' | 'blacksmith';
  dialogue?: string[];
}

export class NPC {
  public id: string;
  public name: string;
  public position: Vec2;
  public type: string;
  public dialogue: string[];
  private animTime: number = 0;
  
  constructor(config: NPCConfig) {
    this.id = config.id;
    this.name = config.name;
    this.position = config.position;
    this.type = config.type;
    this.dialogue = config.dialogue || ['Hello there!'];
  }
  
  public update(deltaTime: number): void {
    this.animTime += deltaTime;
  }
  
  public getAnimOffset(): number {
    // Gentle idle animation
    return Math.sin(this.animTime * 2) * 1;
  }
  
  public isNearPlayer(playerPos: Vec2, interactionRadius: number = 48): boolean {
    const dx = this.position.x - playerPos.x;
    const dy = this.position.y - playerPos.y;
    return dx * dx + dy * dy < interactionRadius * interactionRadius;
  }
}