import { Vec2 } from '../utils/math';

export interface ItemDrop {
  id: number;
  position: Vec2;
  itemType: string;
  quantity: number;
  bobOffset: number;
  bobTime: number;
}

export class ItemDropManager {
  private drops: Map<number, ItemDrop> = new Map();
  private nextId: number = 1;
  
  public createDrop(x: number, y: number, itemType: string, quantity: number = 1): void {
    const drop: ItemDrop = {
      id: this.nextId++,
      position: new Vec2(x, y),
      itemType,
      quantity,
      bobOffset: 0,
      bobTime: Math.random() * Math.PI * 2 // Random starting phase for bobbing
    };
    
    this.drops.set(drop.id, drop);
  }
  
  public update(deltaTime: number): void {
    // Update bobbing animation for all drops
    this.drops.forEach(drop => {
      drop.bobTime += deltaTime * 3; // Speed of bobbing
      drop.bobOffset = Math.sin(drop.bobTime) * 2; // 2 pixel bob amplitude
    });
  }
  
  public checkPickup(playerX: number, playerY: number, pickupRadius: number = 24): ItemDrop[] {
    const pickedUp: ItemDrop[] = [];
    const toRemove: number[] = [];
    
    this.drops.forEach((drop, id) => {
      const dx = drop.position.x - playerX;
      const dy = drop.position.y - playerY;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < pickupRadius * pickupRadius) {
        pickedUp.push(drop);
        toRemove.push(id);
      }
    });
    
    // Remove picked up items
    toRemove.forEach(id => this.drops.delete(id));
    
    return pickedUp;
  }
  
  public getDrops(): ItemDrop[] {
    return Array.from(this.drops.values());
  }
  
  public clear(): void {
    this.drops.clear();
  }
}