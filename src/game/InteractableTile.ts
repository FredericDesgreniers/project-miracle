import { Vec2 } from '../utils/math';
import { Interactable, Action } from './ActionSystem';
import { Keys } from '../engine/Input';
import { TileMap, TileType, Tile } from './TileMap';
import { Player } from './Player';
import { ItemDropManager } from './ItemDrop';
import { AudioSystem } from '../engine/AudioSystem';
import { InventorySystem } from './InventorySystem';

export class InteractableTile implements Interactable {
  public position: Vec2;
  private tileX: number;
  private tileY: number;
  private tileMap: TileMap;
  private player: Player;
  private itemDropManager: ItemDropManager;
  private audioSystem?: AudioSystem;
  private inventorySystem: InventorySystem;
  
  constructor(
    tileX: number, 
    tileY: number, 
    tileMap: TileMap, 
    player: Player,
    itemDropManager: ItemDropManager,
    inventorySystem: InventorySystem,
    audioSystem?: AudioSystem
  ) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.position = new Vec2(tileX * 32 + 16, tileY * 32 + 16); // Center of tile
    this.tileMap = tileMap;
    this.player = player;
    this.itemDropManager = itemDropManager;
    this.inventorySystem = inventorySystem;
    this.audioSystem = audioSystem;
  }
  
  public getAvailableActions(): Action[] {
    const actions: Action[] = [];
    const tile = this.tileMap.getTileAt(this.tileX, this.tileY);
    
    if (!tile) return actions;
    
    // Determine available actions based on tile type and player's selected tool
    const selectedItem = this.inventorySystem.getSelectedHotbarItem();
    if (!selectedItem) return actions;
    
    const toolType = selectedItem.toolType;
    
    switch (tile.type) {
      case TileType.Grass:
      case TileType.Dirt:
        if (toolType === 'hoe') {
          actions.push({
            id: 'till',
            name: 'Till Soil',
            key: 'Click',
            keyCode: Keys.Space, // We'll handle mouse separately
            icon: '⛏️'
          });
        }
        break;
        
      case TileType.TilledDirt:
        if (!tile.planted && toolType === 'seeds') {
          actions.push({
            id: 'plant',
            name: 'Plant Seeds',
            key: 'Click',
            keyCode: Keys.Space,
            icon: '🌱'
          });
        } else if (toolType === 'wateringCan') {
          actions.push({
            id: 'water',
            name: 'Water',
            key: 'Click',
            keyCode: Keys.Space,
            icon: '💧'
          });
        }
        break;
        
      case TileType.PlantedDirt:
        if (toolType === 'wateringCan' && !tile.watered) {
          actions.push({
            id: 'water',
            name: 'Water',
            key: 'Click',
            keyCode: Keys.Space,
            icon: '💧'
          });
        } else if (toolType === 'scythe' && tile.growth && tile.growth >= 1.0) {
          actions.push({
            id: 'harvest',
            name: 'Harvest',
            key: 'Click',
            keyCode: Keys.Space,
            icon: '🌾'
          });
        }
        break;
        
      case TileType.Tree:
        if (toolType === 'axe') {
          actions.push({
            id: 'chop',
            name: 'Chop Tree',
            key: 'Click',
            keyCode: Keys.Space,
            icon: '🪓'
          });
        }
        break;
    }
    
    return actions;
  }
  
  public canInteract(playerPos: Vec2, playerFacing: string): boolean {
    // Check if player is close enough (within interaction range)
    const interactionRange = 48;
    const dx = this.position.x - playerPos.x;
    const dy = this.position.y - playerPos.y;
    const distSq = dx * dx + dy * dy;
    
    return distSq <= interactionRange * interactionRange;
  }
  
  public performAction(actionId: string): void {
    const worldX = this.position.x;
    const worldY = this.position.y;
    
    // This would be called by mouse click, but we're showing the indicator
    // The actual action is performed through the existing player interaction system
    switch (actionId) {
      case 'till':
      case 'plant':
      case 'water':
      case 'harvest':
      case 'chop':
        this.player.interactAt(worldX, worldY, this.tileMap, this.itemDropManager, this.audioSystem);
        break;
    }
  }
}