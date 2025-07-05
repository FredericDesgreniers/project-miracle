export interface ShopItem {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  quantity?: number;
}

export class Shop {
  private items: ShopItem[] = [];
  private isOpen: boolean = false;
  
  constructor() {
    this.initializeShopItems();
  }
  
  private initializeShopItems(): void {
    this.items = [
      {
        id: 'seeds',
        name: 'Carrot Seeds',
        buyPrice: 10,
        sellPrice: 5,
        quantity: -1 // Infinite
      },
      {
        id: 'carrot',
        name: 'Carrot',
        buyPrice: 30,
        sellPrice: 15,
        quantity: 0 // We're selling, not buying
      }
    ];
  }
  
  public open(): void {
    this.isOpen = true;
  }
  
  public close(): void {
    this.isOpen = false;
  }
  
  public isShopOpen(): boolean {
    return this.isOpen;
  }
  
  public getItems(): ShopItem[] {
    return this.items;
  }
  
  public canBuyItem(itemId: string, playerMoney: number): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;
    
    // Can't buy items that the shop doesn't sell
    if (itemId === 'carrot') return false;
    
    return playerMoney >= item.buyPrice;
  }
  
  public buyItem(itemId: string): number {
    const item = this.items.find(i => i.id === itemId);
    if (!item || itemId === 'carrot') return 0;
    
    return item.buyPrice;
  }
  
  public sellItem(itemId: string, quantity: number = 1): number {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return 0;
    
    return item.sellPrice * quantity;
  }
}