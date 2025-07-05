export enum ToolType {
  None = 'none',
  Hoe = 'hoe',
  Seeds = 'seeds',
  WateringCan = 'wateringCan',
  Scythe = 'scythe',
  Axe = 'axe'
}

export interface Tool {
  type: ToolType;
  name: string;
  icon: string;
  quantity?: number;
}

export class Inventory {
  private tools: Tool[] = [];
  private selectedIndex: number = 0;
  
  constructor() {
    this.initializeTools();
  }
  
  private initializeTools(): void {
    this.tools = [
      { type: ToolType.Hoe, name: 'Hoe', icon: '⛏️' },
      { type: ToolType.Seeds, name: 'Carrot Seeds', icon: '🥕', quantity: 10 },
      { type: ToolType.WateringCan, name: 'Watering Can', icon: '💧' },
      { type: ToolType.Scythe, name: 'Scythe', icon: '🌾' },
      { type: ToolType.Axe, name: 'Axe', icon: '🪓' }
    ];
  }
  
  public getSelectedTool(): Tool {
    return this.tools[this.selectedIndex];
  }
  
  public selectTool(index: number): void {
    if (index >= 0 && index < this.tools.length) {
      this.selectedIndex = index;
    }
  }
  
  public selectNextTool(): void {
    this.selectedIndex = (this.selectedIndex + 1) % this.tools.length;
  }
  
  public selectPreviousTool(): void {
    this.selectedIndex = (this.selectedIndex - 1 + this.tools.length) % this.tools.length;
  }
  
  public consumeSeed(): boolean {
    const tool = this.getSelectedTool();
    if (tool.type === ToolType.Seeds && tool.quantity && tool.quantity > 0) {
      tool.quantity--;
      return true;
    }
    return false;
  }
  
  public addSeeds(quantity: number): void {
    const seedTool = this.tools.find(t => t.type === ToolType.Seeds);
    if (seedTool && seedTool.quantity !== undefined) {
      seedTool.quantity += quantity;
    }
  }
  
  public getTools(): Tool[] {
    return this.tools;
  }
  
  public getSelectedIndex(): number {
    return this.selectedIndex;
  }
}