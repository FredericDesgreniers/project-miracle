export enum TileType {
  Grass = 0,
  Dirt = 1,
  Stone = 2,
  Water = 3,
  TilledDirt = 4,
  PlantedDirt = 5,
  Tree = 6,
}

export interface Tile {
  type: TileType;
  solid: boolean;
  tilled?: boolean;
  tilledTime?: number;
  planted?: boolean;
  growth?: number;
  watered?: boolean;
  lastWatered?: number;
  cropType?: string;
  treeHealth?: number;
}

export class TileMap {
  private tiles: Tile[][];
  private width: number;
  private height: number;
  private tileSize: number;
  
  constructor(width: number, height: number, tileSize: number = 32) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.tiles = [];
    
    this.generateMap();
  }
  
  private generateMap(): void {
    // Initialize with grass
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = {
          type: TileType.Grass,
          solid: false,
        };
      }
    }
    
    // Add some random features
    this.generateRiver();
    this.generateStones();
    this.generateDirtPatches();
    this.generateTrees();
  }
  
  private generateRiver(): void {
    const riverY = Math.floor(this.height / 2);
    const riverWidth = 3;
    
    for (let x = 0; x < this.width; x++) {
      const offset = Math.sin(x * 0.3) * 2;
      for (let dy = -riverWidth; dy <= riverWidth; dy++) {
        const y = Math.floor(riverY + offset + dy);
        if (y >= 0 && y < this.height) {
          this.tiles[y][x] = {
            type: TileType.Water,
            solid: true,
          };
        }
      }
    }
  }
  
  private generateStones(): void {
    const stoneCount = Math.floor(this.width * this.height * 0.02);
    for (let i = 0; i < stoneCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.tiles[y][x].type === TileType.Grass) {
        this.tiles[y][x] = {
          type: TileType.Stone,
          solid: true,
        };
      }
    }
  }
  
  private generateDirtPatches(): void {
    const patchCount = 5;
    for (let i = 0; i < patchCount; i++) {
      const centerX = Math.floor(Math.random() * this.width);
      const centerY = Math.floor(Math.random() * this.height);
      const radius = 2 + Math.floor(Math.random() * 3);
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const x = centerX + dx;
            const y = centerY + dy;
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
              if (this.tiles[y][x].type === TileType.Grass) {
                this.tiles[y][x] = {
                  type: TileType.Dirt,
                  solid: false,
                };
              }
            }
          }
        }
      }
    }
  }
  
  private generateTrees(): void {
    const treeCount = Math.floor(this.width * this.height * 0.03); // 3% of tiles
    for (let i = 0; i < treeCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      // Only place trees on grass tiles and ensure some spacing
      if (this.tiles[y][x].type === TileType.Grass) {
        // Check for nearby trees to avoid clustering
        let hasNearbyTree = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const checkX = x + dx;
            const checkY = y + dy;
            if (checkX >= 0 && checkX < this.width && checkY >= 0 && checkY < this.height) {
              if (this.tiles[checkY][checkX].type === TileType.Tree) {
                hasNearbyTree = true;
                break;
              }
            }
          }
          if (hasNearbyTree) break;
        }
        
        if (!hasNearbyTree) {
          this.tiles[y][x] = {
            type: TileType.Tree,
            solid: true,
            treeHealth: 3, // Takes 3 hits to chop down
          };
        }
      }
    }
  }
  
  public getTile(x: number, y: number): Tile | null {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return null;
    }
    
    return this.tiles[tileY][tileX];
  }
  
  public getTileAt(tileX: number, tileY: number): Tile | null {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return null;
    }
    
    return this.tiles[tileY][tileX];
  }
  
  public setTile(tileX: number, tileY: number, tile: Tile): void {
    if (tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height) {
      this.tiles[tileY][tileX] = tile;
    }
  }
  
  public tillTile(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    const tile = this.getTileAt(tileX, tileY);
    
    
    if (tile && (tile.type === TileType.Grass || tile.type === TileType.Dirt)) {
      this.tiles[tileY][tileX] = {
        type: TileType.TilledDirt,
        solid: false,
        tilled: true,
        tilledTime: Date.now(),
      };
      return true;
    }
    
    return false;
  }
  
  public plantSeed(x: number, y: number, cropType: string = 'carrot'): boolean {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    const tile = this.getTileAt(tileX, tileY);
    
    if (tile && tile.type === TileType.TilledDirt && !tile.planted) {
      this.tiles[tileY][tileX] = {
        type: TileType.PlantedDirt,
        solid: false,
        tilled: true,
        planted: true,
        growth: 0,
        watered: false,
        cropType: cropType
      };
      return true;
    }
    
    return false;
  }
  
  public waterTile(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    const tile = this.getTileAt(tileX, tileY);
    
    if (tile && (tile.type === TileType.TilledDirt || tile.type === TileType.PlantedDirt)) {
      tile.watered = true;
      tile.lastWatered = Date.now();
      return true;
    }
    
    return false;
  }
  
  public harvestCrop(x: number, y: number): string | null {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    const tile = this.getTileAt(tileX, tileY);
    
    if (tile && tile.type === TileType.PlantedDirt && tile.growth && tile.growth >= 1) {
      const cropType = tile.cropType || 'carrot';
      // Reset tile to tilled dirt
      this.tiles[tileY][tileX] = {
        type: TileType.TilledDirt,
        solid: false,
        tilled: true,
        watered: false
      };
      return cropType;
    }
    
    return null;
  }
  
  public chopTree(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    const tile = this.getTileAt(tileX, tileY);
    
    if (tile && tile.type === TileType.Tree) {
      if (tile.treeHealth && tile.treeHealth > 1) {
        // Damage the tree
        tile.treeHealth--;
        return false; // Tree not yet chopped down
      } else {
        // Tree is chopped down, convert to grass
        this.tiles[tileY][tileX] = {
          type: TileType.Grass,
          solid: false,
        };
        return true; // Tree was chopped down
      }
    }
    
    return false;
  }
  
  public updateCrops(deltaTime: number): void {
    const currentTime = Date.now();
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        if (tile.type === TileType.PlantedDirt && tile.planted && tile.growth !== undefined) {
          // Crops grow when watered
          if (tile.watered) {
            tile.growth = Math.min(1, tile.growth + deltaTime * 0.1); // Grow over ~10 seconds
            
            // Dry out after some time
            if (tile.lastWatered && currentTime - tile.lastWatered > 5000) {
              tile.watered = false;
            }
          }
        } else if (tile.type === TileType.TilledDirt && !tile.planted) {
          // Revert tilled dirt to grass after 30 seconds if not planted
          if (tile.tilledTime && currentTime - tile.tilledTime > 30000) {
            this.tiles[y][x] = {
              type: TileType.Grass,
              solid: false,
            };
          }
        }
      }
    }
  }
  
  public isSolid(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile ? tile.solid : true;
  }
  
  public getWidth(): number {
    return this.width;
  }
  
  public getHeight(): number {
    return this.height;
  }
  
  public getTileSize(): number {
    return this.tileSize;
  }
  
  public getWorldWidth(): number {
    return this.width * this.tileSize;
  }
  
  public getWorldHeight(): number {
    return this.height * this.tileSize;
  }
}