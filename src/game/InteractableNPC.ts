import { Vec2 } from '../utils/math';
import { Interactable, Action } from './ActionSystem';
import { NPC } from './NPC';
import { Keys } from '../engine/Input';
import { Shop } from './Shop';
import { Game } from './Game';

export class InteractableNPC implements Interactable {
  private npc: NPC;
  private shop?: Shop;
  private game: Game;
  private onInteract?: () => void;
  
  constructor(npc: NPC, game: Game, shop?: Shop) {
    this.npc = npc;
    this.game = game;
    this.shop = shop;
  }
  
  get position(): Vec2 {
    return this.npc.position;
  }
  
  public getAvailableActions(): Action[] {
    const actions: Action[] = [];
    
    // Talk action is always available
    actions.push({
      id: 'talk',
      name: 'Talk',
      key: 'E',
      keyCode: Keys.E,
      icon: '💬'
    });
    
    // Shop action for shopkeepers
    if (this.npc.type === 'shopkeeper' && this.shop) {
      actions.push({
        id: 'shop',
        name: 'Shop',
        key: 'F',
        keyCode: Keys.F,
        icon: '🛍️'
      });
    }
    
    return actions;
  }
  
  public canInteract(playerPos: Vec2, playerFacing: string): boolean {
    // Check if player is near enough
    const interactionRadius = 48;
    const dx = this.npc.position.x - playerPos.x;
    const dy = this.npc.position.y - playerPos.y;
    const distSq = dx * dx + dy * dy;
    
    if (distSq > interactionRadius * interactionRadius) {
      return false;
    }
    
    // Check if player is facing the NPC
    const angle = Math.atan2(dy, dx);
    const facingAngle = this.getFacingAngle(playerFacing);
    const angleDiff = Math.abs(this.normalizeAngle(angle - facingAngle));
    
    // Allow interaction if facing within ~90 degrees
    return angleDiff < Math.PI / 2;
  }
  
  public performAction(actionId: string): void {
    switch (actionId) {
      case 'talk':
        // Show dialogue (you might want to implement a dialogue system)
        console.log(`${this.npc.name}: ${this.npc.dialogue[0]}`);
        break;
        
      case 'shop':
        if (this.shop) {
          if (this.shop.isShopOpen()) {
            this.shop.close();
          } else {
            this.shop.open();
          }
        }
        break;
    }
  }
  
  private getFacingAngle(facing: string): number {
    switch (facing) {
      case 'up': return -Math.PI / 2;
      case 'down': return Math.PI / 2;
      case 'left': return Math.PI;
      case 'right': return 0;
      default: return 0;
    }
  }
  
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
}