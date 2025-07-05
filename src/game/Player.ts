import { Vec2 } from '../utils/math';
import { TileMap } from './TileMap';
import { Inventory, ToolType } from './Inventory';
import { ItemDropManager } from './ItemDrop';
import { AudioSystem } from '../engine/AudioSystem';

export class Player {
  private position: Vec2;
  private velocity: Vec2;
  private size: Vec2;
  private speed: number;
  private facing: 'up' | 'down' | 'left' | 'right';
  private inventory: Inventory;
  private harvestedCrops: Map<string, number> = new Map();
  private isUsingTool: boolean = false;
  private toolUseTime: number = 0;
  private toolUseDuration: number = 0.3; // 300ms animation
  private money: number = 100; // Starting money
  
  constructor(x: number, y: number) {
    this.position = new Vec2(x, y);
    this.velocity = new Vec2(0, 0);
    this.size = new Vec2(24, 24);
    this.speed = 150;
    this.facing = 'down';
    this.inventory = new Inventory();
  }
  
  public update(deltaTime: number, movement: Vec2, tileMap: TileMap): void {
    // Update tool animation
    if (this.isUsingTool) {
      this.toolUseTime += deltaTime;
      if (this.toolUseTime >= this.toolUseDuration) {
        this.isUsingTool = false;
        this.toolUseTime = 0;
      }
    }
    
    // Update velocity based on input (slower when using tool)
    const speedMultiplier = this.isUsingTool ? 0.5 : 1.0;
    this.velocity = movement.multiply(this.speed * speedMultiplier);
    
    // Update facing direction
    if (Math.abs(this.velocity.x) > Math.abs(this.velocity.y)) {
      this.facing = this.velocity.x > 0 ? 'right' : 'left';
    } else if (this.velocity.y !== 0) {
      this.facing = this.velocity.y > 0 ? 'down' : 'up';
    }
    
    // Calculate new position
    const newX = this.position.x + this.velocity.x * deltaTime;
    const newY = this.position.y + this.velocity.y * deltaTime;
    
    // Check collision for X movement
    if (!this.checkCollision(newX, this.position.y, tileMap)) {
      this.position.x = newX;
    }
    
    // Check collision for Y movement
    if (!this.checkCollision(this.position.x, newY, tileMap)) {
      this.position.y = newY;
    }
    
    // Keep player within world bounds
    const worldWidth = tileMap.getWorldWidth();
    const worldHeight = tileMap.getWorldHeight();
    
    this.position.x = Math.max(this.size.x / 2, Math.min(worldWidth - this.size.x / 2, this.position.x));
    this.position.y = Math.max(this.size.y / 2, Math.min(worldHeight - this.size.y / 2, this.position.y));
  }
  
  private checkCollision(x: number, y: number, tileMap: TileMap): boolean {
    const halfWidth = this.size.x / 2;
    const halfHeight = this.size.y / 2;
    
    // Check corners
    const corners = [
      { x: x - halfWidth, y: y - halfHeight },
      { x: x + halfWidth, y: y - halfHeight },
      { x: x - halfWidth, y: y + halfHeight },
      { x: x + halfWidth, y: y + halfHeight },
    ];
    
    for (const corner of corners) {
      if (tileMap.isSolid(corner.x, corner.y)) {
        return true;
      }
    }
    
    return false;
  }
  
  public interact(tileMap: TileMap, itemDropManager: ItemDropManager, audioSystem?: AudioSystem): void {
    // Don't allow tool use while animating
    if (this.isUsingTool) return;
    
    // Start tool animation
    this.isUsingTool = true;
    this.toolUseTime = 0;
    
    // Get the tile in front of the player
    let targetX = this.position.x;
    let targetY = this.position.y;
    const interactDistance = 32;
    
    switch (this.facing) {
      case 'up':
        targetY -= interactDistance;
        break;
      case 'down':
        targetY += interactDistance;
        break;
      case 'left':
        targetX -= interactDistance;
        break;
      case 'right':
        targetX += interactDistance;
        break;
    }
    
    const tool = this.inventory.getSelectedTool();
    
    switch (tool.type) {
      case ToolType.Hoe:
        if (tileMap.tillTile(targetX, targetY)) {
          audioSystem?.playSound('hoe', 0.5);
        }
        break;
        
      case ToolType.Seeds:
        const canPlant = tileMap.plantSeed(targetX, targetY);
        if (canPlant) {
          if (!this.inventory.consumeSeed()) {
            // Revert the planting since we don't have seeds
            const tileX = Math.floor(targetX / 32);
            const tileY = Math.floor(targetY / 32);
            const tile = tileMap.getTileAt(tileX, tileY);
            if (tile) {
              tile.type = TileType.TilledDirt;
              tile.planted = false;
              tile.growth = undefined;
            }
          } else {
            audioSystem?.playSound('plant', 0.4);
          }
        }
        break;
        
      case ToolType.WateringCan:
        if (tileMap.waterTile(targetX, targetY)) {
          audioSystem?.playSound('watering', 0.4);
        }
        break;
        
      case ToolType.Scythe:
        const crop = tileMap.harvestCrop(targetX, targetY);
        if (crop) {
          audioSystem?.playSound('scythe', 0.5);
          // Drop the crop on the ground instead of directly collecting
          itemDropManager.createDrop(targetX, targetY, crop, 1);
          // Also drop some seeds
          itemDropManager.createDrop(targetX + 10, targetY - 10, 'seeds', 2);
        }
        break;
        
      case ToolType.Axe:
        const treeChopped = tileMap.chopTree(targetX, targetY);
        audioSystem?.playSound('axe', 0.6);
        if (treeChopped) {
          // Drop wood when tree is fully chopped
          itemDropManager.createDrop(targetX, targetY, 'wood', 3);
          itemDropManager.createDrop(targetX - 10, targetY + 10, 'wood', 2);
        }
        break;
    }
  }
  
  public interactAt(worldX: number, worldY: number, tileMap: TileMap, itemDropManager: ItemDropManager, audioSystem?: AudioSystem): void {
    // Don't allow tool use while animating
    if (this.isUsingTool) return;
    
    // Start tool animation
    this.isUsingTool = true;
    this.toolUseTime = 0;
    
    const tool = this.inventory.getSelectedTool();
    
    switch (tool.type) {
      case ToolType.Hoe:
        if (tileMap.tillTile(worldX, worldY)) {
          audioSystem?.playSound('hoe', 0.5);
        }
        break;
        
      case ToolType.Seeds:
        const canPlant = tileMap.plantSeed(worldX, worldY);
        if (canPlant) {
          if (!this.inventory.consumeSeed()) {
            // Revert the planting since we don't have seeds
            const tileX = Math.floor(worldX / 32);
            const tileY = Math.floor(worldY / 32);
            const tile = tileMap.getTileAt(tileX, tileY);
            if (tile) {
              tile.type = TileType.TilledDirt;
              tile.planted = false;
              tile.growth = undefined;
            }
          } else {
            audioSystem?.playSound('plant', 0.4);
          }
        }
        break;
        
      case ToolType.WateringCan:
        if (tileMap.waterTile(worldX, worldY)) {
          audioSystem?.playSound('watering', 0.4);
        }
        break;
        
      case ToolType.Scythe:
        const crop = tileMap.harvestCrop(worldX, worldY);
        if (crop) {
          audioSystem?.playSound('scythe', 0.5);
          // Drop the crop on the ground instead of directly collecting
          itemDropManager.createDrop(worldX, worldY, crop, 1);
          // Also drop some seeds
          itemDropManager.createDrop(worldX + 10, worldY - 10, 'seeds', 2);
        }
        break;
        
      case ToolType.Axe:
        const treeChopped = tileMap.chopTree(worldX, worldY);
        audioSystem?.playSound('axe', 0.6);
        if (treeChopped) {
          // Drop wood when tree is fully chopped
          itemDropManager.createDrop(worldX, worldY, 'wood', 3);
          itemDropManager.createDrop(worldX - 10, worldY + 10, 'wood', 2);
        }
        break;
    }
  }
  
  public getPosition(): Vec2 {
    return this.position;
  }
  
  public getSize(): Vec2 {
    return this.size;
  }
  
  public getFacing(): string {
    return this.facing;
  }
  
  public getInventory(): Inventory {
    return this.inventory;
  }
  
  public getHarvestedCrops(): Map<string, number> {
    return this.harvestedCrops;
  }
  
  public isAnimatingTool(): boolean {
    return this.isUsingTool;
  }
  
  public getToolAnimationProgress(): number {
    return this.isUsingTool ? this.toolUseTime / this.toolUseDuration : 0;
  }
  
  public collectItems(itemDropManager: ItemDropManager, audioSystem?: AudioSystem): void {
    const pickedUp = itemDropManager.checkPickup(this.position.x, this.position.y);
    
    pickedUp.forEach(drop => {
      if (drop.itemType === 'seeds') {
        this.inventory.addSeeds(drop.quantity);
        console.log(`Picked up ${drop.quantity} seeds!`);
      } else {
        // It's a crop or resource
        const currentCount = this.harvestedCrops.get(drop.itemType) || 0;
        this.harvestedCrops.set(drop.itemType, currentCount + drop.quantity);
        console.log(`Picked up ${drop.quantity} ${drop.itemType}!`);
      }
      
      // Play pickup sound
      audioSystem?.playSound('pickup', 0.4);
    });
  }
  
  public getMoney(): number {
    return this.money;
  }
  
  public addMoney(amount: number): void {
    this.money += amount;
  }
  
  public spendMoney(amount: number): boolean {
    if (this.money >= amount) {
      this.money -= amount;
      return true;
    }
    return false;
  }
}