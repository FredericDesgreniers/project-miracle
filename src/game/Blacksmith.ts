export interface BlacksmithItem {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  quantity?: number;
}

export class Blacksmith {
  private items: BlacksmithItem[] = [];
  private isOpen: boolean = false;
  
  constructor() {
    this.initializeBlacksmithItems();
  }
  
  private initializeBlacksmithItems(): void {
    this.items = [
      {
        id: 'wood',
        name: 'Wood',
        buyPrice: 0, // We don't buy wood
        sellPrice: 5, // Sell wood for 5 coins
        quantity: 0
      },
      {
        id: 'iron_ingot',
        name: 'Iron Ingot',
        buyPrice: 25,
        sellPrice: 0, // Can't sell ingots back
        quantity: -1 // Infinite
      },
      {
        id: 'gold_ingot',
        name: 'Gold Ingot',
        buyPrice: 100,
        sellPrice: 0, // Can't sell ingots back
        quantity: -1 // Infinite
      }
    ];
  }
  
  public open(): void {
    this.isOpen = true;
  }
  
  public close(): void {
    this.isOpen = false;
  }
  
  public isBlacksmithOpen(): boolean {
    return this.isOpen;
  }
  
  public getItems(): BlacksmithItem[] {
    return this.items;
  }
  
  public canBuyItem(itemId: string, playerMoney: number): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;
    
    // Can't buy wood from blacksmith
    if (itemId === 'wood') return false;
    
    return playerMoney >= item.buyPrice;
  }
  
  public buyItem(itemId: string): number {
    const item = this.items.find(i => i.id === itemId);
    if (!item || itemId === 'wood') return 0;
    
    return item.buyPrice;
  }
  
  public sellItem(itemId: string, quantity: number = 1): number {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return 0;
    
    return item.sellPrice * quantity;
  }
}