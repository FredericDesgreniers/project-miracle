export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  quantity: number;
  stackable: boolean;
  type: 'tool' | 'resource' | 'seed' | 'crop' | 'material';
  toolType?: string; // For tools
}

export interface InventorySlot {
  item: InventoryItem | null;
  row: number;
  col: number;
}

export class InventorySystem {
  private grid: InventorySlot[][];
  private hotbar: InventorySlot[];
  private gridSize = { rows: 6, cols: 6 };
  private hotbarSize = 6;
  private isOpen = false;
  private selectedHotbarSlot = 0;
  
  // Dragging state
  private draggedItem: InventoryItem | null = null;
  private draggedFromSlot: { row: number, col: number, isHotbar: boolean } | null = null;
  
  constructor() {
    // Initialize empty grid
    this.grid = [];
    for (let row = 0; row < this.gridSize.rows; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize.cols; col++) {
        this.grid[row][col] = { item: null, row, col };
      }
    }
    
    // Initialize hotbar
    this.hotbar = [];
    for (let i = 0; i < this.hotbarSize; i++) {
      this.hotbar[i] = { item: null, row: -1, col: i };
    }
    
    // Add starting items
    this.initializeStartingItems();
  }
  
  private initializeStartingItems(): void {
    // Add tools to hotbar
    this.hotbar[0].item = {
      id: 'hoe',
      name: 'Hoe',
      icon: '⛏️',
      quantity: 1,
      stackable: false,
      type: 'tool',
      toolType: 'hoe'
    };
    
    this.hotbar[1].item = {
      id: 'axe',
      name: 'Axe',
      icon: '🪓',
      quantity: 1,
      stackable: false,
      type: 'tool',
      toolType: 'axe'
    };
    
    this.hotbar[2].item = {
      id: 'watering_can',
      name: 'Watering Can',
      icon: '💧',
      quantity: 1,
      stackable: false,
      type: 'tool',
      toolType: 'wateringCan'
    };
    
    this.hotbar[3].item = {
      id: 'scythe',
      name: 'Scythe',
      icon: '🌾',
      quantity: 1,
      stackable: false,
      type: 'tool',
      toolType: 'scythe'
    };
    
    // Add seeds to hotbar for easy access
    this.hotbar[4].item = {
      id: 'carrot_seeds',
      name: 'Carrot Seeds',
      icon: '🥕',
      quantity: 10,
      stackable: true,
      type: 'seed',
      toolType: 'seeds'
    };
  }
  
  public addItem(item: InventoryItem): boolean {
    // If stackable, try to find existing stack
    if (item.stackable) {
      // Check hotbar first
      for (const slot of this.hotbar) {
        if (slot.item && slot.item.id === item.id) {
          slot.item.quantity += item.quantity;
          return true;
        }
      }
      
      // Then check grid
      for (let row = 0; row < this.gridSize.rows; row++) {
        for (let col = 0; col < this.gridSize.cols; col++) {
          const slot = this.grid[row][col];
          if (slot.item && slot.item.id === item.id) {
            slot.item.quantity += item.quantity;
            return true;
          }
        }
      }
    }
    
    // Find empty slot in grid
    for (let row = 0; row < this.gridSize.rows; row++) {
      for (let col = 0; col < this.gridSize.cols; col++) {
        if (!this.grid[row][col].item) {
          this.grid[row][col].item = { ...item };
          return true;
        }
      }
    }
    
    return false; // Inventory full
  }
  
  public removeItem(id: string, quantity: number): boolean {
    // Check hotbar first
    for (const slot of this.hotbar) {
      if (slot.item && slot.item.id === id) {
        if (slot.item.quantity >= quantity) {
          slot.item.quantity -= quantity;
          if (slot.item.quantity === 0) {
            slot.item = null;
          }
          return true;
        }
      }
    }
    
    // Then check grid
    for (let row = 0; row < this.gridSize.rows; row++) {
      for (let col = 0; col < this.gridSize.cols; col++) {
        const slot = this.grid[row][col];
        if (slot.item && slot.item.id === id) {
          if (slot.item.quantity >= quantity) {
            slot.item.quantity -= quantity;
            if (slot.item.quantity === 0) {
              slot.item = null;
            }
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  public getItemCount(id: string): number {
    let count = 0;
    
    // Count in hotbar
    for (const slot of this.hotbar) {
      if (slot.item && slot.item.id === id) {
        count += slot.item.quantity;
      }
    }
    
    // Count in grid
    for (let row = 0; row < this.gridSize.rows; row++) {
      for (let col = 0; col < this.gridSize.cols; col++) {
        const slot = this.grid[row][col];
        if (slot.item && slot.item.id === id) {
          count += slot.item.quantity;
        }
      }
    }
    
    return count;
  }
  
  public startDragging(row: number, col: number, isHotbar: boolean): void {
    const slot = isHotbar ? this.hotbar[col] : this.grid[row][col];
    if (slot.item) {
      this.draggedItem = { ...slot.item };
      this.draggedFromSlot = { row, col, isHotbar };
      slot.item = null;
    }
  }
  
  public dropItem(row: number, col: number, isHotbar: boolean): void {
    if (!this.draggedItem || !this.draggedFromSlot) return;
    
    const targetSlot = isHotbar ? this.hotbar[col] : this.grid[row][col];
    const sourceSlot = this.draggedFromSlot.isHotbar 
      ? this.hotbar[this.draggedFromSlot.col] 
      : this.grid[this.draggedFromSlot.row][this.draggedFromSlot.col];
    
    // If target has item, swap them
    if (targetSlot.item) {
      sourceSlot.item = targetSlot.item;
    }
    
    targetSlot.item = this.draggedItem;
    
    this.draggedItem = null;
    this.draggedFromSlot = null;
  }
  
  public cancelDragging(): void {
    if (this.draggedItem && this.draggedFromSlot) {
      const slot = this.draggedFromSlot.isHotbar 
        ? this.hotbar[this.draggedFromSlot.col] 
        : this.grid[this.draggedFromSlot.row][this.draggedFromSlot.col];
      slot.item = this.draggedItem;
    }
    
    this.draggedItem = null;
    this.draggedFromSlot = null;
  }
  
  public toggleInventory(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.cancelDragging();
    }
  }
  
  public isInventoryOpen(): boolean {
    return this.isOpen;
  }
  
  public selectHotbarSlot(index: number): void {
    if (index >= 0 && index < this.hotbarSize) {
      this.selectedHotbarSlot = index;
    }
  }
  
  public getSelectedHotbarItem(): InventoryItem | null {
    return this.hotbar[this.selectedHotbarSlot].item;
  }
  
  public getGrid(): InventorySlot[][] {
    return this.grid;
  }
  
  public getHotbar(): InventorySlot[] {
    return this.hotbar;
  }
  
  public getSelectedHotbarIndex(): number {
    return this.selectedHotbarSlot;
  }
  
  public getDraggedItem(): InventoryItem | null {
    return this.draggedItem;
  }
  
  public getGridSize(): { rows: number, cols: number } {
    return this.gridSize;
  }
  
  public quickTransfer(row: number, col: number, isHotbar: boolean): void {
    const sourceSlot = isHotbar ? this.hotbar[col] : this.grid[row][col];
    if (!sourceSlot.item) return;
    
    if (isHotbar) {
      // Transfer from hotbar to first available inventory slot
      for (let r = 0; r < this.gridSize.rows; r++) {
        for (let c = 0; c < this.gridSize.cols; c++) {
          const targetSlot = this.grid[r][c];
          
          // Try to stack with existing items first
          if (sourceSlot.item.stackable && targetSlot.item && targetSlot.item.id === sourceSlot.item.id) {
            targetSlot.item.quantity += sourceSlot.item.quantity;
            sourceSlot.item = null;
            return;
          }
        }
      }
      
      // If no stack found, find empty slot
      for (let r = 0; r < this.gridSize.rows; r++) {
        for (let c = 0; c < this.gridSize.cols; c++) {
          if (!this.grid[r][c].item) {
            this.grid[r][c].item = sourceSlot.item;
            sourceSlot.item = null;
            return;
          }
        }
      }
    } else {
      // Transfer from inventory to first available hotbar slot
      for (let i = 0; i < this.hotbarSize; i++) {
        const targetSlot = this.hotbar[i];
        
        // Try to stack with existing items first
        if (sourceSlot.item.stackable && targetSlot.item && targetSlot.item.id === sourceSlot.item.id) {
          targetSlot.item.quantity += sourceSlot.item.quantity;
          sourceSlot.item = null;
          return;
        }
      }
      
      // If no stack found, find empty slot
      for (let i = 0; i < this.hotbarSize; i++) {
        if (!this.hotbar[i].item) {
          this.hotbar[i].item = sourceSlot.item;
          sourceSlot.item = null;
          return;
        }
      }
    }
  }
}