import { Vec2 } from '../utils/math';
import { TileMap, TileType } from './TileMap';
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
  private sprintMultiplier: number = 1.75; // Sprint speed multiplier
  private animationTime: number = 0;
  private isMoving: boolean = false;
  
  constructor(x: number, y: number) {
    this.position = new Vec2(x, y);
    this.velocity = new Vec2(0, 0);
    this.size = new Vec2(24, 24);
    this.speed = 150;
    this.facing = 'down';
    this.inventory = new Inventory();
  }
  
  public update(deltaTime: number, movement: Vec2, tileMap: TileMap, isSprinting: boolean = false): void {
    // Update tool animation
    if (this.isUsingTool) {
      this.toolUseTime += deltaTime;
      if (this.toolUseTime >= this.toolUseDuration) {
        this.isUsingTool = false;
        this.toolUseTime = 0;
      }
    }
    
    // Update movement animation
    this.isMoving = movement.length() > 0;
    if (this.isMoving) {
      this.animationTime += deltaTime;
    } else {
      this.animationTime = 0; // Reset to idle
    }
    
    // Update velocity based on input (slower when using tool, faster when sprinting)
    let speedMultiplier = this.isUsingTool ? 0.5 : 1.0;
    if (isSprinting && !this.isUsingTool) {
      speedMultiplier *= this.sprintMultiplier;
    }
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
  
  public interact(tileMap: TileMap, itemDropManager: ItemDropManager, audioSystem?: AudioSystem, toolTypeOverride?: string): void {
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
    
    const toolType = toolTypeOverride || this.inventory.getSelectedTool().type;
    
    switch (toolType) {
      case ToolType.Hoe:
      case 'hoe':
        if (tileMap.tillTile(targetX, targetY)) {
          audioSystem?.playSound('hoe', 0.5);
        }
        break;
        
      case ToolType.Seeds:
      case 'seeds':
        if (tileMap.plantSeed(targetX, targetY)) {
          audioSystem?.playSound('plant', 0.4);
        }
        break;
        
      case ToolType.WateringCan:
      case 'wateringCan':
        if (tileMap.waterTile(targetX, targetY)) {
          audioSystem?.playSound('watering', 0.4);
        }
        break;
        
      case ToolType.Scythe:
      case 'scythe':
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
      case 'axe':
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
  
  public interactAt(worldX: number, worldY: number, tileMap: TileMap, itemDropManager: ItemDropManager, audioSystem?: AudioSystem, toolTypeOverride?: string): void {
    // Don't allow tool use while animating
    if (this.isUsingTool) return;
    
    // Start tool animation
    this.isUsingTool = true;
    this.toolUseTime = 0;
    
    const toolType = toolTypeOverride || this.inventory.getSelectedTool().type;
    
    switch (toolType) {
      case ToolType.Hoe:
        if (tileMap.tillTile(worldX, worldY)) {
          audioSystem?.playSound('hoe', 0.5);
        }
        break;
        
      case ToolType.Seeds:
      case 'seeds':
        if (tileMap.plantSeed(worldX, worldY)) {
          audioSystem?.playSound('plant', 0.4);
        }
        break;
        
      case ToolType.WateringCan:
      case 'wateringCan':
        if (tileMap.waterTile(worldX, worldY)) {
          audioSystem?.playSound('watering', 0.4);
        }
        break;
        
      case ToolType.Scythe:
      case 'scythe':
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
      case 'axe':
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
  
  public collectItems(itemDropManager: ItemDropManager, audioSystem?: AudioSystem, inventorySystem?: any): void {
    const pickedUp = itemDropManager.checkPickup(this.position.x, this.position.y);
    
    pickedUp.forEach(drop => {
      let added = false;
      
      if (inventorySystem) {
        // Create inventory item based on drop type
        let item = null;
        
        if (drop.itemType === 'seeds') {
          item = {
            id: 'carrot_seeds',
            name: 'Carrot Seeds',
            icon: '🥕',
            quantity: drop.quantity,
            stackable: true,
            type: 'seed' as const,
            toolType: 'seeds'
          };
        } else if (drop.itemType === 'carrot') {
          item = {
            id: 'carrot',
            name: 'Carrot',
            icon: '🥕',
            quantity: drop.quantity,
            stackable: true,
            type: 'crop' as const
          };
        } else if (drop.itemType === 'wood') {
          item = {
            id: 'wood',
            name: 'Wood',
            icon: '🪵',
            quantity: drop.quantity,
            stackable: true,
            type: 'resource' as const
          };
        }
        
        if (item) {
          added = inventorySystem.addItem(item);
        }
      } else {
        // Fallback to old system
        if (drop.itemType === 'seeds') {
          this.inventory.addSeeds(drop.quantity);
          added = true;
        } else {
          const currentCount = this.harvestedCrops.get(drop.itemType) || 0;
          this.harvestedCrops.set(drop.itemType, currentCount + drop.quantity);
          added = true;
        }
      }
      
      if (added) {
        console.log(`Picked up ${drop.quantity} ${drop.itemType}!`);
        // Play pickup sound
        audioSystem?.playSound('pickup', 0.4);
      }
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
  
  public getAnimationTime(): number {
    return this.animationTime;
  }
  
  public isPlayerMoving(): boolean {
    return this.isMoving;
  }
}