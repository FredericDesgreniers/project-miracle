import { InventorySystem, InventorySlot, InventoryItem } from './InventorySystem';

export class InventoryUI {
  private container: HTMLDivElement | null = null;
  private hotbarContainer: HTMLDivElement | null = null;
  private inventorySystem: InventorySystem;
  private mousePos = { x: 0, y: 0 };
  private hoveredSlot: { row: number, col: number, isHotbar: boolean } | null = null;
  private handledKeys = new Set<string>();
  private tooltip: HTMLDivElement | null = null;
  
  constructor(inventorySystem: InventorySystem) {
    this.inventorySystem = inventorySystem;
    this.createHotbar();
    this.createTooltip();
    this.setupMouseTracking();
  }
  
  private setupMouseTracking(): void {
    document.addEventListener('mousemove', (e) => {
      this.mousePos = { x: e.clientX, y: e.clientY };
      this.updateDraggedItem();
      this.updateTooltip();
    });
  }
  
  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      pointer-events: none;
      z-index: 3000;
      display: none;
      border: 1px solid #555;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(this.tooltip);
  }
  
  private updateTooltip(): void {
    if (!this.tooltip) return;
    
    if (this.hoveredSlot && !this.inventorySystem.getDraggedItem()) {
      const slot = this.hoveredSlot.isHotbar 
        ? this.inventorySystem.getHotbar()[this.hoveredSlot.col]
        : this.inventorySystem.getGrid()[this.hoveredSlot.row][this.hoveredSlot.col];
      
      if (slot.item) {
        this.tooltip.style.display = 'block';
        this.tooltip.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 4px;">${slot.item.name}</div>
          ${slot.item.quantity > 1 ? `<div style="color: #AAA; font-size: 12px;">Quantity: ${slot.item.quantity}</div>` : ''}
          ${slot.item.type === 'tool' ? `<div style="color: #FFD700; font-size: 12px;">Tool</div>` : ''}
          ${slot.item.type === 'seed' ? `<div style="color: #90EE90; font-size: 12px;">Seed - Can be planted</div>` : ''}
          ${slot.item.type === 'crop' ? `<div style="color: #FFA500; font-size: 12px;">Crop - Can be sold</div>` : ''}
          ${slot.item.type === 'resource' ? `<div style="color: #8B7355; font-size: 12px;">Resource</div>` : ''}
        `;
        
        // Position tooltip near cursor but avoid edge overflow
        const tooltipRect = this.tooltip.getBoundingClientRect();
        let x = this.mousePos.x + 15;
        let y = this.mousePos.y + 15;
        
        // Adjust if tooltip would go off screen
        if (x + tooltipRect.width > window.innerWidth) {
          x = this.mousePos.x - tooltipRect.width - 15;
        }
        if (y + tooltipRect.height > window.innerHeight) {
          y = this.mousePos.y - tooltipRect.height - 15;
        }
        
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
      } else {
        this.tooltip.style.display = 'none';
      }
    } else {
      this.tooltip.style.display = 'none';
    }
  }
  
  private createHotbar(): void {
    this.hotbarContainer = document.createElement('div');
    this.hotbarContainer.id = 'hotbar';
    this.hotbarContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      background: rgba(0, 0, 0, 0.7);
      padding: 8px;
      border-radius: 8px;
      border: 2px solid #444;
      z-index: 100;
    `;
    
    document.body.appendChild(this.hotbarContainer);
    this.updateHotbar();
  }
  
  public updateHotbar(): void {
    if (!this.hotbarContainer) return;
    
    this.hotbarContainer.innerHTML = '';
    const hotbar = this.inventorySystem.getHotbar();
    const selectedIndex = this.inventorySystem.getSelectedHotbarIndex();
    
    hotbar.forEach((slot, index) => {
      const slotElement = this.createSlotElement(slot, true, index);
      
      // Highlight selected slot
      if (index === selectedIndex) {
        slotElement.style.border = '2px solid #FFD700';
        slotElement.style.boxShadow = '0 0 10px #FFD700';
      }
      
      // Add number key hint
      const keyHint = document.createElement('div');
      keyHint.style.cssText = `
        position: absolute;
        top: 2px;
        left: 2px;
        font-size: 10px;
        color: #AAA;
        text-shadow: 1px 1px 2px black;
      `;
      keyHint.textContent = (index + 1).toString();
      slotElement.appendChild(keyHint);
      
      this.hotbarContainer.appendChild(slotElement);
    });
  }
  
  public showInventory(): void {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.id = 'inventory';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      border: 3px solid #444;
      border-radius: 10px;
      padding: 20px;
      z-index: 1000;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
    `;
    
    // Add keyboard event listener for hotbar assignment
    this.setupHotbarAssignment();
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Inventory';
    title.style.cssText = `
      color: white;
      text-align: center;
      margin: 0 0 20px 0;
      font-size: 24px;
    `;
    this.container.appendChild(title);
    
    // Grid container
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 4px;
      margin-bottom: 20px;
    `;
    
    // Create grid slots
    const grid = this.inventorySystem.getGrid();
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const slot = grid[row][col];
        const slotElement = this.createSlotElement(slot, false, col, row);
        gridContainer.appendChild(slotElement);
      }
    }
    
    this.container.appendChild(gridContainer);
    
    // Close hint
    const closeHint = document.createElement('p');
    closeHint.textContent = 'Press E to close';
    closeHint.style.cssText = `
      color: #AAA;
      text-align: center;
      margin: 10px 0 0 0;
      font-size: 14px;
    `;
    this.container.appendChild(closeHint);
    
    document.body.appendChild(this.container);
    
    // Dragged item display (append to body, not container)
    const draggedDisplay = document.createElement('div');
    draggedDisplay.id = 'dragged-item';
    draggedDisplay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2000;
      display: none;
    `;
    document.body.appendChild(draggedDisplay);
  }
  
  public hideInventory(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    // Also remove dragged item display
    const draggedDisplay = document.getElementById('dragged-item');
    if (draggedDisplay) {
      draggedDisplay.remove();
    }
    // Clean up event handlers
    this.removeHotbarAssignment();
  }
  
  private createSlotElement(slot: InventorySlot, isHotbar: boolean, col: number, row: number = -1): HTMLDivElement {
    const slotElement = document.createElement('div');
    slotElement.style.cssText = `
      width: 50px;
      height: 50px;
      background: rgba(50, 50, 50, 0.8);
      border: 2px solid #666;
      border-radius: 4px;
      position: relative;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      user-select: none;
    `;
    
    if (slot.item) {
      slotElement.innerHTML = `
        <span style="font-size: 28px;">${slot.item.icon}</span>
        ${slot.item.quantity > 1 ? `<span style="
          position: absolute;
          bottom: 2px;
          right: 2px;
          font-size: 12px;
          color: white;
          text-shadow: 1px 1px 2px black;
          background: rgba(0, 0, 0, 0.5);
          padding: 0 3px;
          border-radius: 3px;
        ">${slot.item.quantity}</span>` : ''}
      `;
    }
    
    // Mouse events
    slotElement.addEventListener('mousedown', (e) => {
      e.preventDefault();
      
      // If this is a hotbar slot and inventory is closed, just select it
      if (isHotbar && !this.inventorySystem.isInventoryOpen()) {
        this.inventorySystem.selectHotbarSlot(col);
        this.updateHotbar();
        return;
      }
      
      // Check for shift-click
      if (e.shiftKey && slot.item && this.inventorySystem.isInventoryOpen()) {
        this.inventorySystem.quickTransfer(row, col, isHotbar);
        this.updateDisplay();
        return;
      }
      
      // Otherwise allow dragging
      if (slot.item) {
        this.inventorySystem.startDragging(row, col, isHotbar);
        this.updateDisplay();
      }
    });
    
    slotElement.addEventListener('mouseup', (e) => {
      e.preventDefault();
      
      // Only handle drops if inventory is open
      if (this.inventorySystem.isInventoryOpen() && this.inventorySystem.getDraggedItem()) {
        this.inventorySystem.dropItem(row, col, isHotbar);
        this.updateDisplay();
      }
    });
    
    slotElement.addEventListener('mouseenter', () => {
      slotElement.style.background = 'rgba(80, 80, 80, 0.8)';
      this.hoveredSlot = { row, col, isHotbar };
    });
    
    slotElement.addEventListener('mouseleave', () => {
      slotElement.style.background = 'rgba(50, 50, 50, 0.8)';
      this.hoveredSlot = null;
    });
    
    return slotElement;
  }
  
  private updateDraggedItem(): void {
    const draggedDisplay = document.getElementById('dragged-item');
    if (!draggedDisplay) return;
    
    const draggedItem = this.inventorySystem.getDraggedItem();
    if (draggedItem) {
      draggedDisplay.style.display = 'block';
      draggedDisplay.style.left = `${this.mousePos.x - 25}px`;
      draggedDisplay.style.top = `${this.mousePos.y - 25}px`;
      draggedDisplay.innerHTML = `
        <div style="
          width: 50px;
          height: 50px;
          background: rgba(50, 50, 50, 0.9);
          border: 2px solid #888;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          opacity: 0.8;
        ">
          ${draggedItem.icon}
          ${draggedItem.quantity > 1 ? `<span style="
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 12px;
            color: white;
            text-shadow: 1px 1px 2px black;
          ">${draggedItem.quantity}</span>` : ''}
        </div>
      `;
    } else {
      draggedDisplay.style.display = 'none';
    }
  }
  
  public updateDisplay(): void {
    this.updateHotbar();
    if (this.container) {
      // Update inventory grid without recreating everything
      this.refreshInventoryGrid();
    }
    this.updateDraggedItem();
  }
  
  private refreshInventoryGrid(): void {
    if (!this.container) return;
    
    const gridContainer = this.container.querySelector('div[style*="grid-template-columns"]') as HTMLDivElement;
    if (!gridContainer) return;
    
    gridContainer.innerHTML = '';
    
    // Recreate grid slots
    const grid = this.inventorySystem.getGrid();
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const slot = grid[row][col];
        const slotElement = this.createSlotElement(slot, false, col, row);
        gridContainer.appendChild(slotElement);
      }
    }
  }
  
  public cleanup(): void {
    if (this.container) {
      this.container.remove();
    }
    if (this.hotbarContainer) {
      this.hotbarContainer.remove();
    }
    if (this.tooltip) {
      this.tooltip.remove();
    }
    this.removeHotbarAssignment();
  }
  
  public isKeyHandled(keyCode: string): boolean {
    return this.handledKeys.has(keyCode);
  }
  
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;
  
  private setupHotbarAssignment(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      // Check if it's a number key 1-6
      const key = e.key;
      if (key >= '1' && key <= '6' && this.hoveredSlot && this.inventorySystem.isInventoryOpen()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.handledKeys.add(e.code);
        const hotbarIndex = parseInt(key) - 1;
        this.quickAssignToHotbar(hotbarIndex);
      }
    };
    
    // Add keyup handler to clear handled keys
    this.keyupHandler = (e: KeyboardEvent) => {
      this.handledKeys.delete(e.code);
    };
    
    document.addEventListener('keydown', this.keyHandler, true);
    document.addEventListener('keyup', this.keyupHandler, true);
  }
  
  private removeHotbarAssignment(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.keyupHandler) {
      document.removeEventListener('keyup', this.keyupHandler, true);
      this.keyupHandler = null;
    }
    this.handledKeys.clear();
  }
  
  private quickAssignToHotbar(hotbarIndex: number): void {
    if (!this.hoveredSlot) return;
    
    const sourceSlot = this.hoveredSlot.isHotbar 
      ? this.inventorySystem.getHotbar()[this.hoveredSlot.col]
      : this.inventorySystem.getGrid()[this.hoveredSlot.row][this.hoveredSlot.col];
    
    const targetSlot = this.inventorySystem.getHotbar()[hotbarIndex];
    
    if (sourceSlot.item) {
      // Swap items
      const temp = targetSlot.item;
      targetSlot.item = sourceSlot.item;
      sourceSlot.item = temp;
      
      // Update only the hotbar and affected grid slot
      this.updateHotbar();
      if (this.container && !this.hoveredSlot.isHotbar) {
        // Update only the specific grid slot
        const gridContainer = this.container.querySelector('div[style*="grid-template-columns"]') as HTMLDivElement;
        if (gridContainer) {
          const slotIndex = this.hoveredSlot.row * 6 + this.hoveredSlot.col;
          const slotElement = gridContainer.children[slotIndex] as HTMLDivElement;
          if (slotElement) {
            const newSlotElement = this.createSlotElement(sourceSlot, false, this.hoveredSlot.col, this.hoveredSlot.row);
            gridContainer.replaceChild(newSlotElement, slotElement);
          }
        }
      }
    }
  }
}