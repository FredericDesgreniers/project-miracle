import { Renderer } from '../engine/Renderer';
import { SpriteBatch } from '../engine/SpriteBatch';
import { Texture } from '../engine/Texture';
import { Camera } from '../engine/Camera';
import { Input, Keys } from '../engine/Input';
import { TileMap, TileType } from './TileMap';
import { Player } from './Player';
import { ToolType } from './Inventory';
import { ItemDropManager } from './ItemDrop';
import { NPC } from './NPC';
import { Shop } from './Shop';
import { Vec2 } from '../utils/math';
import { Shader } from '../engine/Shader';
import { spriteVertexShader, spriteFragmentShader } from '../engine/shaders/sprite';
import { Mat4 } from '../utils/math';
import { AudioSystem } from '../engine/AudioSystem';
import { InventorySystem } from './InventorySystem';
import { InventoryUI } from './InventoryUI';
import { ActionSystem } from './ActionSystem';
import { InteractableNPC } from './InteractableNPC';
import { InteractableTile } from './InteractableTile';
import { TileActionRenderer, TileAction } from './TileActionRenderer';
import { Blacksmith } from './Blacksmith';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private spriteBatch: SpriteBatch;
  private camera: Camera;
  private input: Input;
  
  private tileMap: TileMap;
  private player: Player;
  private itemDropManager: ItemDropManager;
  private shopkeeper: NPC;
  private shop: Shop;
  private blacksmithNPC: NPC;
  private blacksmith: Blacksmith;
  
  private textures: Map<string, Texture> = new Map();
  private whiteTexture!: Texture;
  
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private debugLogTime: number = 0;
  private shopToggled: boolean = false;
  private mouseWorldPos: Vec2 = new Vec2(0, 0);
  private hoveredTile: Vec2 | null = null;
  private audioSystem: AudioSystem;
  private lastFootstepTime: number = 0;
  private footstepInterval: number = 0.3; // Time between footsteps
  private inventorySystem: InventorySystem;
  private inventoryUI: InventoryUI;
  private actionSystem: ActionSystem;
  private tileActionRenderer: TileActionRenderer;
  private currentTileActions: TileAction[] = [];
  
  private findSafeSpawnPosition(): Vec2 {
    const tileSize = this.tileMap.getTileSize();
    const worldWidth = this.tileMap.getWidth();
    const worldHeight = this.tileMap.getHeight();
    
    // Try to find a grass or dirt tile near the center of the map
    const centerX = Math.floor(worldWidth / 2);
    const centerY = Math.floor(worldHeight / 2);
    
    // Search in expanding circles from the center
    for (let radius = 0; radius < Math.max(worldWidth, worldHeight) / 2; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check points on the circle perimeter for efficiency
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < worldWidth && y >= 0 && y < worldHeight) {
            const tile = this.tileMap.getTileAt(x, y);
            if (tile && (tile.type === TileType.Grass || tile.type === TileType.Dirt) && !tile.solid) {
              // Found a safe tile, return world coordinates
              return new Vec2(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
            }
          }
        }
      }
    }
    
    // Fallback to center if no safe position found (shouldn't happen)
    console.warn('No safe spawn position found, using center');
    return new Vec2(worldWidth * tileSize / 2, worldHeight * tileSize / 2);
  }
  
  private findSafePositionNear(nearX: number, nearY: number, maxDistance: number): Vec2 {
    const tileSize = this.tileMap.getTileSize();
    const startTileX = Math.floor(nearX / tileSize);
    const startTileY = Math.floor(nearY / tileSize);
    const maxTileRadius = Math.ceil(maxDistance / tileSize);
    
    // Search in expanding circles from the starting position
    for (let radius = 1; radius <= maxTileRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check points on the circle perimeter
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const x = startTileX + dx;
          const y = startTileY + dy;
          
          if (x >= 0 && x < this.tileMap.getWidth() && y >= 0 && y < this.tileMap.getHeight()) {
            const tile = this.tileMap.getTileAt(x, y);
            if (tile && (tile.type === TileType.Grass || tile.type === TileType.Dirt) && !tile.solid) {
              // Found a safe tile
              return new Vec2(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
            }
          }
        }
      }
    }
    
    // If no safe position found nearby, return the original position
    console.warn('No safe position found near', nearX, nearY);
    return new Vec2(nearX, nearY);
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupCanvas();
    
    this.renderer = new Renderer(canvas);
    this.spriteBatch = new SpriteBatch(this.renderer.getGL());
    this.camera = new Camera(canvas.width, canvas.height);
    this.input = new Input(canvas);
    
    this.tileMap = new TileMap(50, 50, 32);
    
    // Find a safe spawn position for the player
    const spawnPos = this.findSafeSpawnPosition();
    this.player = new Player(spawnPos.x, spawnPos.y);
    this.itemDropManager = new ItemDropManager();
    
    // Create shopkeeper NPC at a safe position near spawn
    const shopkeeperPos = this.findSafePositionNear(spawnPos.x, spawnPos.y, 200);
    this.shopkeeper = new NPC({
      id: 'shopkeeper',
      name: 'Emma',
      position: shopkeeperPos,
      type: 'shopkeeper',
      dialogue: [
        'Welcome to Emma\'s Seeds & Produce!',
        'I buy fresh carrots and sell quality seeds.',
        'Press F to open the shop!'
      ]
    });
    
    this.shop = new Shop();
    
    // Create blacksmith NPC at a safe position away from shopkeeper
    const blacksmithPos = this.findSafePositionNear(spawnPos.x + 300, spawnPos.y, 200);
    this.blacksmithNPC = new NPC({
      id: 'blacksmith',
      name: 'Bjorn',
      position: blacksmithPos,
      type: 'blacksmith',
      dialogue: [
        'Welcome to Bjorn\'s Forge!',
        'I buy wood and sell fine metal ingots.',
        'Press F to trade!'
      ]
    });
    
    this.blacksmith = new Blacksmith();
    
    this.audioSystem = new AudioSystem();
    this.inventorySystem = new InventorySystem();
    this.inventoryUI = new InventoryUI(this.inventorySystem);
    this.actionSystem = new ActionSystem();
    this.tileActionRenderer = new TileActionRenderer(this.renderer);
    
    // Register shopkeeper as interactable
    const interactableShopkeeper = new InteractableNPC(this.shopkeeper, this, this.shop);
    this.actionSystem.registerInteractable('shopkeeper', interactableShopkeeper);
    
    // Register blacksmith as interactable
    const interactableBlacksmith = new InteractableNPC(this.blacksmithNPC, this, undefined, this.blacksmith);
    this.actionSystem.registerInteractable('blacksmith', interactableBlacksmith);
    
    this.setupEventListeners();
    this.init();
    
    // Make game instance accessible for shop buttons
    (window as any).gameInstance = this;
  }
  
  public handleShopBuy(): void {
    console.log('Shop buy button clicked!');
    if (this.player.getMoney() >= 10) {
      this.player.spendMoney(10);
      this.inventorySystem.addItem({
        id: 'carrot_seeds',
        name: 'Carrot Seeds',
        icon: '🥕',
        quantity: 5,
        stackable: true,
        type: 'seed',
        toolType: 'seeds'
      });
      this.inventoryUI.updateHotbar();
      this.updateShopUI();
      this.audioSystem.playSound('pickup', 0.4);
    }
  }
  
  public handleShopSell(): void {
    console.log('Shop sell button clicked!');
    const carrotCount = this.inventorySystem.getItemCount('carrot');
    if (carrotCount > 0) {
      this.inventorySystem.removeItem('carrot', 1);
      this.player.addMoney(15);
      this.inventoryUI.updateHotbar();
      this.updateShopUI();
      this.audioSystem.playSound('pickup', 0.5);
    }
  }
  
  public handleBlacksmithSellWood(): void {
    console.log('Blacksmith sell wood clicked!');
    const woodCount = this.inventorySystem.getItemCount('wood');
    if (woodCount > 0) {
      this.inventorySystem.removeItem('wood', 1);
      this.player.addMoney(5);
      this.inventoryUI.updateHotbar();
      this.updateBlacksmithUI();
      this.audioSystem.playSound('pickup', 0.4);
    }
  }
  
  public handleBlacksmithBuyIron(): void {
    console.log('Blacksmith buy iron clicked!');
    if (this.player.getMoney() >= 25) {
      this.player.spendMoney(25);
      this.inventorySystem.addItem({
        id: 'iron_ingot',
        name: 'Iron Ingot',
        icon: '⚙️',
        quantity: 1,
        stackable: true,
        type: 'material'
      });
      this.inventoryUI.updateHotbar();
      this.updateBlacksmithUI();
      this.audioSystem.playSound('pickup', 0.5);
    }
  }
  
  public handleBlacksmithBuyGold(): void {
    console.log('Blacksmith buy gold clicked!');
    if (this.player.getMoney() >= 100) {
      this.player.spendMoney(100);
      this.inventorySystem.addItem({
        id: 'gold_ingot',
        name: 'Gold Ingot',
        icon: '🟨',
        quantity: 1,
        stackable: true,
        type: 'material'
      });
      this.inventoryUI.updateHotbar();
      this.updateBlacksmithUI();
      this.audioSystem.playSound('pickup', 0.6);
    }
  }
  
  private async init(): Promise<void> {
    await this.loadAssets();
    this.start();
    
    // Load music in the background without blocking
    this.loadAndPlayMusic().catch(error => {
      console.error('Failed to load music:', error);
    });
  }
  
  private setupCanvas(): void {
    this.canvas.width = 800;
    this.canvas.height = 600;
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.renderer.resize(this.canvas.width, this.canvas.height);
      this.camera.resize(this.canvas.width, this.canvas.height);
    });
    
    // Setup volume control
    const volumeSlider = document.getElementById('musicVolume') as HTMLInputElement;
    const volumeValue = document.getElementById('volumeValue');
    
    if (volumeSlider && volumeValue) {
      volumeSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const volume = value / 100;
        this.audioSystem.setMusicVolume(volume);
        volumeValue.textContent = `${value}%`;
      });
      
      // Set initial volume
      const initialVolume = parseInt(volumeSlider.value) / 100;
      this.audioSystem.setMusicVolume(initialVolume);
    }
  }
  
  private async loadAndPlayMusic(): Promise<void> {
    // Load and play background music
    try {
      await this.audioSystem.loadMusic('/sound/Harvest Glow.mp3');
      
      // Start playing music after a user interaction to comply with browser autoplay policies
      const startMusic = () => {
        this.audioSystem.playMusic(true); // Loop the music
        // Remove the listener after first interaction
        window.removeEventListener('click', startMusic);
        window.removeEventListener('keydown', startMusic);
      };
      
      // Add listeners for user interaction (on window to catch any click)
      window.addEventListener('click', startMusic);
      window.addEventListener('keydown', startMusic);
      
      console.log('Music load initiated, waiting for user interaction...');
    } catch (error) {
      console.error('Failed to load music:', error);
    }
  }
  
  private async loadAssets(): Promise<void> {
    const gl = this.renderer.getGL();
    
    // Create white texture for rendering colored quads
    this.whiteTexture = Texture.createSolid(gl, 1, 1, 255, 255, 255);
    
    // Load grass texture from image
    try {
      console.log('Loading grass texture from image...');
      const grassTexture = await Texture.load(gl, '/images/grass.png');
      this.textures.set('grass', grassTexture);
      console.log('Grass texture loaded successfully');
    } catch (error) {
      console.error('Failed to load grass.png, using procedural texture:', error);
      this.textures.set('grass', Texture.generateGrassTile(gl));
    }
    
    // Load dirt texture from image
    try {
      console.log('Loading dirt texture from image...');
      const dirtTexture = await Texture.load(gl, '/images/dirt-1.png');
      this.textures.set('dirt', dirtTexture);
      console.log('Dirt texture loaded successfully');
    } catch (error) {
      console.error('Failed to load dirt-1.png, using procedural texture:', error);
      this.textures.set('dirt', Texture.generateDirtTile(gl));
    }
    
    // Load stone texture from image
    try {
      console.log('Loading stone texture from image...');
      const stoneTexture = await Texture.load(gl, '/images/stone-1.png');
      this.textures.set('stone', stoneTexture);
      console.log('Stone texture loaded successfully');
    } catch (error) {
      console.error('Failed to load stone-1.png, using procedural texture:', error);
      this.textures.set('stone', Texture.generateStoneTile(gl));
    }
    
    // Load water texture from image
    try {
      console.log('Loading water texture from image...');
      const waterTexture = await Texture.load(gl, '/images/water-1.png');
      this.textures.set('water', waterTexture);
      console.log('Water texture loaded successfully');
    } catch (error) {
      console.error('Failed to load water-1.png, using procedural texture:', error);
      this.textures.set('water', Texture.generateWaterTile(gl));
    }
    
    // Note: Player texture is generated dynamically during render
    
    // Generate tilled dirt texture
    this.textures.set('tilledDirt', this.generateTilledDirtTexture());
    
    // Generate watered dirt texture
    this.textures.set('wateredDirt', this.generateWateredDirtTexture());
    
    // Generate plant textures for different growth stages
    this.textures.set('plant_0.2', this.generatePlantTexture(0.2));
    this.textures.set('plant_0.5', this.generatePlantTexture(0.5));
    this.textures.set('plant_1.0', this.generatePlantTexture(1.0));
    
    // Generate item drop textures
    this.textures.set('item_carrot', this.generateCarrotItemTexture());
    this.textures.set('item_seeds', this.generateSeedItemTexture());
    this.textures.set('item_tree_seeds', this.generateTreeSeedItemTexture());
    
    // Load wood/log texture from image
    try {
      console.log('Loading wood texture from image...');
      const woodTexture = await Texture.load(gl, '/images/log-1.png');
      this.textures.set('item_wood', woodTexture);
      console.log('Wood texture loaded successfully');
    } catch (error) {
      console.error('Failed to load log-1.png, using procedural texture:', error);
      this.textures.set('item_wood', this.generateWoodItemTexture());
    }
    
    // Load tree textures from images
    const treePromises = [];
    for (let i = 1; i <= 4; i++) {
      treePromises.push(
        Texture.load(gl, `/images/tree-${i}.png`)
          .then(texture => {
            this.textures.set(`tree-${i}`, texture);
            console.log(`Tree texture ${i} loaded successfully`);
          })
          .catch(error => {
            console.error(`Failed to load tree-${i}.png:`, error);
          })
      );
    }
    await Promise.all(treePromises);
    
    // If no tree textures loaded, use procedural as fallback
    if (!this.textures.has('tree-1')) {
      console.log('No tree textures loaded, using procedural texture');
      this.textures.set('tree', this.generateTreeTexture());
    }
    
    // Load character sprite sheet
    try {
      console.log('Loading character sprite sheet...');
      const characterTexture = await Texture.load(gl, '/images/character.png');
      this.textures.set('character', characterTexture);
      console.log('Character sprite sheet loaded successfully');
    } catch (error) {
      console.error('Failed to load character.png:', error);
    }
    
    // Load shopkeeper texture from image
    try {
      console.log('Loading shopkeeper texture from image...');
      const shopkeeperTexture = await Texture.load(gl, '/images/shopkeeper-1.png');
      this.textures.set('shopkeeper', shopkeeperTexture);
      console.log('Shopkeeper texture loaded successfully');
    } catch (error) {
      console.error('Failed to load shopkeeper-1.png, using procedural texture:', error);
      const shopkeeperTex = this.generateShopkeeperTexture();
      this.textures.set('shopkeeper', shopkeeperTex);
    }
    
    // Load blacksmith texture from image
    try {
      console.log('Loading blacksmith texture from image...');
      const blacksmithTexture = await Texture.load(gl, '/images/blacksmithguy-1.png');
      this.textures.set('blacksmith', blacksmithTexture);
      console.log('Blacksmith texture loaded successfully');
    } catch (error) {
      console.error('Failed to load blacksmithguy-1.png, using procedural texture:', error);
      const blacksmithTex = this.generateBlacksmithTexture();
      this.textures.set('blacksmith', blacksmithTex);
    }
    
    // Load shop stall texture from image
    try {
      console.log('Loading shop texture from image...');
      const shopTexture = await Texture.load(gl, '/images/shop-1.png');
      this.textures.set('shop_stall', shopTexture);
      console.log('Shop texture loaded successfully');
    } catch (error) {
      console.error('Failed to load shop-1.png, using procedural texture:', error);
      this.textures.set('shop_stall', this.generateShopStallTexture());
    }
    
    // Load blacksmith forge texture from image
    try {
      console.log('Loading blacksmith forge texture from image...');
      const forgeTexture = await Texture.load(gl, '/images/blacksmith-1.png');
      this.textures.set('forge', forgeTexture);
      console.log('Blacksmith forge texture loaded successfully');
    } catch (error) {
      console.error('Failed to load blacksmith-1.png, using procedural texture:', error);
      this.textures.set('forge', this.generateForgeTexture());
    }
  }
  
  private generatePlayerTexture(facing: string = 'down', toolType?: ToolType, animProgress: number = 0): Texture {
    const gl = this.renderer.getGL();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Save context for transformations
    ctx.save();
    
    // Body position based on facing
    let bodyX = 8, bodyY = 8;
    let headX = 16, headY = 8;
    
    // Draw body
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(bodyX, bodyY, 16, 20);
    
    // Draw head based on facing
    ctx.fillStyle = '#fdbcb4';
    ctx.beginPath();
    ctx.arc(headX, headY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw face based on direction
    ctx.fillStyle = '#000';
    switch (facing) {
      case 'down':
        ctx.fillRect(13, 8, 2, 2);
        ctx.fillRect(17, 8, 2, 2);
        break;
      case 'up':
        // No eyes visible from back
        break;
      case 'left':
        ctx.fillRect(12, 6, 2, 2);
        break;
      case 'right':
        ctx.fillRect(18, 6, 2, 2);
        break;
    }
    
    // Draw tool if equipped
    if (toolType) {
      const swing = Math.sin(animProgress * Math.PI) * 15; // Swing animation
      
      switch (toolType) {
        case ToolType.Hoe:
          ctx.strokeStyle = '#8B4513';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (facing === 'right') {
            ctx.moveTo(24, 16);
            ctx.lineTo(28, 16 - swing);
          } else if (facing === 'left') {
            ctx.moveTo(8, 16);
            ctx.lineTo(4, 16 - swing);
          } else {
            ctx.moveTo(20, 20);
            ctx.lineTo(24, 20 - swing);
          }
          ctx.stroke();
          break;
          
        case ToolType.WateringCan:
          ctx.fillStyle = '#4169E1';
          const canX = facing === 'right' ? 22 : facing === 'left' ? 6 : 20;
          const canY = 18 - swing * 0.5;
          ctx.fillRect(canX, canY, 6, 4);
          break;
          
        case ToolType.Seeds:
          ctx.fillStyle = '#8B4513';
          const seedX = facing === 'right' ? 24 : facing === 'left' ? 4 : 12;
          ctx.beginPath();
          ctx.arc(seedX, 20, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case ToolType.Scythe:
          ctx.strokeStyle = '#C0C0C0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (facing === 'right') {
            ctx.arc(24, 16, 6, -Math.PI/4 - swing/30, Math.PI/4 - swing/30);
          } else if (facing === 'left') {
            ctx.arc(8, 16, 6, 3*Math.PI/4 + swing/30, 5*Math.PI/4 + swing/30);
          } else {
            ctx.moveTo(20, 20);
            ctx.lineTo(26, 20 - swing);
          }
          ctx.stroke();
          break;
          
        case ToolType.Axe:
          // Axe handle
          ctx.strokeStyle = '#8B4513';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (facing === 'right') {
            ctx.moveTo(22, 16);
            ctx.lineTo(28, 16 - swing);
          } else if (facing === 'left') {
            ctx.moveTo(10, 16);
            ctx.lineTo(4, 16 - swing);
          } else {
            ctx.moveTo(20, 20);
            ctx.lineTo(24, 20 - swing);
          }
          ctx.stroke();
          
          // Axe head
          ctx.fillStyle = '#696969';
          if (facing === 'right') {
            ctx.beginPath();
            ctx.moveTo(28, 16 - swing);
            ctx.lineTo(32, 14 - swing);
            ctx.lineTo(32, 18 - swing);
            ctx.closePath();
            ctx.fill();
          } else if (facing === 'left') {
            ctx.beginPath();
            ctx.moveTo(4, 16 - swing);
            ctx.lineTo(0, 14 - swing);
            ctx.lineTo(0, 18 - swing);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(24, 20 - swing);
            ctx.lineTo(22, 18 - swing);
            ctx.lineTo(26, 18 - swing);
            ctx.closePath();
            ctx.fill();
          }
          break;
      }
    }
    
    ctx.restore();
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateTilledDirtTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Base dirt
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, 0, size, size);
    
    // Furrows
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = 4 + i * 8;
      ctx.beginPath();
      ctx.moveTo(2, y);
      ctx.lineTo(30, y);
      ctx.stroke();
    }
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generatePlantTexture(growth: number = 1): Texture {
    const gl = this.renderer.getGL();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    if (growth < 0.3) {
      // Sprout
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, 24);
      ctx.lineTo(16, 20);
      ctx.stroke();
      
      // Tiny leaves
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(14, 20, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(18, 20, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (growth < 0.7) {
      // Growing plant
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(16, 24);
      ctx.lineTo(16, 16);
      ctx.stroke();
      
      // Medium leaves
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.ellipse(12, 16, 4, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(20, 16, 4, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Mature plant with carrots
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(16, 24);
      ctx.lineTo(16, 8);
      ctx.stroke();
      
      // Full leaves
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.ellipse(11, 8, 5, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(21, 8, 5, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Carrot indicator
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.ellipse(16, 20, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateWateredDirtTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Darker, wet dirt
    ctx.fillStyle = '#3d2817';
    ctx.fillRect(0, 0, size, size);
    
    // Wet furrows
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = 4 + i * 8;
      ctx.beginPath();
      ctx.moveTo(2, y);
      ctx.lineTo(30, y);
      ctx.stroke();
    }
    
    // Water shine
    ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';
    ctx.fillRect(0, 0, size, size);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateCarrotItemTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Carrot body
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.lineTo(11, 12);
    ctx.lineTo(8, 14);
    ctx.lineTo(5, 12);
    ctx.closePath();
    ctx.fill();
    
    // Carrot top
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(6, 2, 1, 3);
    ctx.fillRect(8, 2, 1, 3);
    ctx.fillRect(10, 2, 1, 3);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateSeedItemTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Seed pouch
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(4, 6, 8, 8);
    
    // Seeds
    ctx.fillStyle = '#5d460f';
    ctx.fillRect(6, 8, 2, 2);
    ctx.fillRect(8, 10, 2, 2);
    ctx.fillRect(7, 11, 2, 2);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateTreeSeedItemTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Acorn shape (make it larger and brighter)
    ctx.fillStyle = '#D2691E';  // Brighter brown
    ctx.beginPath();
    ctx.arc(8, 10, 5, 0, Math.PI * 2);  // Larger radius
    ctx.fill();
    
    // Acorn cap
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(3, 4, 10, 5);  // Larger cap
    
    // Cap texture
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 6);
    ctx.lineTo(12, 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(12, 8);
    ctx.stroke();
    
    // Add a highlight to make it more visible
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(6, 9, 2, 0, Math.PI * 2);
    ctx.fill();
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateTreeTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 48; // Larger texture size
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas to transparent
    ctx.clearRect(0, 0, size, size);
    
    // Tree trunk (scaled up)
    ctx.fillStyle = '#654321';
    ctx.fillRect(18, 30, 12, 18);
    
    // Trunk texture (scaled up)
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(21, 30);
    ctx.lineTo(21, 48);
    ctx.moveTo(27, 30);
    ctx.lineTo(27, 48);
    ctx.stroke();
    
    // Tree foliage (circular canopy - scaled up)
    ctx.fillStyle = '#228b22';
    ctx.beginPath();
    ctx.arc(24, 18, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Foliage highlights (scaled up)
    ctx.fillStyle = '#32cd32';
    ctx.beginPath();
    ctx.arc(21, 15, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, 16, 4.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Shadow (scaled up)
    ctx.fillStyle = '#1f5f1f';
    ctx.beginPath();
    ctx.arc(24, 22, 10, 0, Math.PI);
    ctx.fill();
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateWoodItemTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Wood log
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(3, 5, 10, 6);
    
    // Wood grain
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 7);
    ctx.lineTo(12, 7);
    ctx.moveTo(4, 9);
    ctx.lineTo(12, 9);
    ctx.stroke();
    
    // End grain circles
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(3, 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(13, 8, 2, 0, Math.PI * 2);
    ctx.fill();
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateShopkeeperTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Body - dress
    ctx.fillStyle = '#8b4789';
    ctx.fillRect(8, 12, 16, 16);
    
    // Head
    ctx.fillStyle = '#fdbcb4';
    ctx.beginPath();
    ctx.arc(16, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair (blonde)
    ctx.fillStyle = '#f4e04d';
    ctx.beginPath();
    ctx.arc(16, 7, 7, Math.PI, 0);
    ctx.fill();
    // Side hair
    ctx.fillRect(9, 7, 2, 8);
    ctx.fillRect(21, 7, 2, 8);
    
    // Eyes
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(13, 9, 2, 2);
    ctx.fillRect(17, 9, 2, 2);
    
    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(16, 11, 2, 0, Math.PI);
    ctx.stroke();
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateBlacksmithTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Body - leather apron
    ctx.fillStyle = '#654321';
    ctx.fillRect(8, 12, 16, 16);
    
    // Arms (muscular)
    ctx.fillStyle = '#d2691e';
    ctx.fillRect(5, 14, 3, 10);
    ctx.fillRect(24, 14, 3, 10);
    
    // Head
    ctx.fillStyle = '#daa520';
    ctx.beginPath();
    ctx.arc(16, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair (dark brown)
    ctx.fillStyle = '#2f1f0f';
    ctx.beginPath();
    ctx.arc(16, 7, 7, Math.PI, 0);
    ctx.fill();
    
    // Beard
    ctx.fillStyle = '#2f1f0f';
    ctx.fillRect(12, 12, 8, 4);
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(13, 9, 2, 2);
    ctx.fillRect(17, 9, 2, 2);
    
    // Hammer in hand
    ctx.fillStyle = '#696969';
    ctx.fillRect(26, 16, 2, 6);
    ctx.fillRect(25, 15, 4, 2);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateShopkeeperPortrait(): string {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Background
    ctx.fillStyle = '#f5e6d3';
    ctx.fillRect(0, 0, size, size);
    
    // Hair back layer
    ctx.fillStyle = '#f4e04d';
    ctx.fillRect(60, 40, 136, 180);
    
    // Neck
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(108, 140, 40, 40);
    
    // Dress collar
    ctx.fillStyle = '#6b3568';
    ctx.fillRect(96, 170, 64, 20);
    
    // Head shape
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(88, 60, 80, 90);
    
    // Hair - bangs
    ctx.fillStyle = '#f4e04d';
    ctx.fillRect(88, 40, 80, 30);
    // Side parts
    ctx.fillRect(68, 60, 20, 60);
    ctx.fillRect(168, 60, 20, 60);
    
    // Hair strands detail
    ctx.fillStyle = '#e6d541';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(90 + i * 15, 42, 10, 26);
    }
    
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(100, 85, 20, 15);
    ctx.fillRect(136, 85, 20, 15);
    
    // Iris
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(105, 88, 12, 12);
    ctx.fillRect(141, 88, 12, 12);
    
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.fillRect(108, 91, 6, 6);
    ctx.fillRect(144, 91, 6, 6);
    
    // Eye highlights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(110, 92, 2, 2);
    ctx.fillRect(146, 92, 2, 2);
    
    // Eyebrows
    ctx.fillStyle = '#d4c339';
    ctx.fillRect(98, 78, 24, 3);
    ctx.fillRect(134, 78, 24, 3);
    
    // Nose
    ctx.fillStyle = '#f4a09a';
    ctx.fillRect(124, 105, 8, 12);
    
    // Mouth
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(116, 125, 24, 8);
    
    // Smile lines
    ctx.fillStyle = '#000000';
    ctx.fillRect(114, 125, 2, 2);
    ctx.fillRect(140, 125, 2, 2);
    
    // Dress details
    ctx.fillStyle = '#8b4789';
    ctx.fillRect(80, 180, 96, 76);
    
    // Dress decoration
    ctx.fillStyle = '#6b3568';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(90 + i * 30, 200, 20, 4);
      ctx.fillRect(90 + i * 30, 220, 20, 4);
    }
    
    // Arms
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(60, 180, 20, 60);
    ctx.fillRect(176, 180, 20, 60);
    
    // Blush
    ctx.fillStyle = 'rgba(255, 182, 193, 0.3)';
    ctx.fillRect(88, 108, 16, 12);
    ctx.fillRect(152, 108, 16, 12);
    
    return canvas.toDataURL();
  }
  
  private generateShopStallTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Stall counter
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 32, 64, 32);
    
    // Counter top
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(0, 32, 64, 4);
    
    // Awning
    ctx.fillStyle = '#DC143C';
    ctx.fillRect(0, 0, 64, 20);
    
    // Awning stripes
    ctx.fillStyle = '#FFF';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(i * 16 + 4, 0, 8, 20);
    }
    
    // Sign
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(20, 22, 24, 8);
    ctx.fillStyle = '#000';
    ctx.font = '6px Arial';
    ctx.fillText('SHOP', 26, 28);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateStumpTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Clear to transparent
    ctx.clearRect(0, 0, size, size);
    
    // Tree stump
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner rings
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(16, 16, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(16, 16, 5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center
    ctx.fillStyle = '#4a3018';
    ctx.beginPath();
    ctx.arc(16, 16, 2, 0, Math.PI * 2);
    ctx.fill();
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  private generateForgeTexture(): Texture {
    const gl = this.renderer.getGL();
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Forge base (stone)
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, 24, 64, 40);
    
    // Forge opening (with fire glow)
    ctx.fillStyle = '#ff4500';
    ctx.fillRect(20, 32, 24, 20);
    
    // Inner fire
    ctx.fillStyle = '#ff6347';
    ctx.fillRect(24, 36, 16, 12);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(28, 40, 8, 6);
    
    // Anvil (on top)
    ctx.fillStyle = '#2f2f2f';
    ctx.fillRect(8, 20, 20, 4);
    ctx.fillRect(12, 16, 12, 4);
    
    // Chimney
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(48, 0, 12, 30);
    
    // Smoke
    ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
    ctx.beginPath();
    ctx.arc(54, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(54, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    
    const imageData = ctx.getImageData(0, 0, size, size);
    return Texture.fromImageData(gl, imageData);
  }
  
  public start(): void {
    console.log('Starting game with loaded textures...');
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }
  
  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    this.updateFPS(currentTime);
    
    requestAnimationFrame(this.gameLoop);
  };
  
  private update(deltaTime: number): void {
    
    // Update mouse world position
    const mousePos = this.input.getMousePosition();
    this.mouseWorldPos = this.camera.screenToWorld(mousePos.x, mousePos.y);
    
    // Update hovered tile
    const tileSize = this.tileMap.getTileSize();
    const tileX = Math.floor(this.mouseWorldPos.x / tileSize);
    const tileY = Math.floor(this.mouseWorldPos.y / tileSize);
    
    // Check if player can reach this tile
    const playerPos = this.player.getPosition();
    const dx = (tileX * tileSize + tileSize/2) - playerPos.x;
    const dy = (tileY * tileSize + tileSize/2) - playerPos.y;
    const distSq = dx * dx + dy * dy;
    const reachDistance = 64; // 2 tiles
    
    if (distSq < reachDistance * reachDistance && !this.shop.isShopOpen()) {
      this.hoveredTile = new Vec2(tileX, tileY);
    } else {
      this.hoveredTile = null;
    }
    
    // Update player
    const movement = this.input.getMovementVector();
    const isSprinting = this.input.isKeyDown(Keys.Shift);
    this.player.update(deltaTime, movement, this.tileMap, isSprinting);
    
    // Play footstep sounds when moving
    if (movement.length() > 0 && !this.player.isAnimatingTool()) {
      this.lastFootstepTime += deltaTime;
      const currentFootstepInterval = isSprinting ? this.footstepInterval * 0.6 : this.footstepInterval;
      if (this.lastFootstepTime >= currentFootstepInterval) {
        this.audioSystem.playFootstep();
        this.lastFootstepTime = 0;
      }
    } else {
      this.lastFootstepTime = this.footstepInterval; // Reset so next step plays immediately
    }
    
    // Clear current tile actions
    this.currentTileActions = [];
    
    // Check for NPC interactions
    if (this.shopkeeper.isNearPlayer(this.player.getPosition())) {
      const npcWorldPos = this.shopkeeper.position;
      this.currentTileActions.push({
        position: new Vec2(npcWorldPos.x, npcWorldPos.y - 16),
        key: 'E'
      });
      this.currentTileActions.push({
        position: new Vec2(npcWorldPos.x, npcWorldPos.y),
        key: 'F'
      });
    }
    
    // Check for blacksmith interactions
    if (this.blacksmithNPC.isNearPlayer(this.player.getPosition())) {
      const npcWorldPos = this.blacksmithNPC.position;
      this.currentTileActions.push({
        position: new Vec2(npcWorldPos.x, npcWorldPos.y - 16),
        key: 'E'
      });
      this.currentTileActions.push({
        position: new Vec2(npcWorldPos.x, npcWorldPos.y),
        key: 'F'
      });
    }
    
    // Check for tile interactions at mouse position
    if (this.hoveredTile) {
      const tile = this.tileMap.getTileAt(this.hoveredTile.x, this.hoveredTile.y);
      const selectedItem = this.inventorySystem.getSelectedHotbarItem();
      
      if (tile && selectedItem && selectedItem.toolType) {
        const worldX = this.hoveredTile.x * 32 + 16;
        const worldY = this.hoveredTile.y * 32 + 16;
        
        // Check what action is available
        let showAction = false;
        
        switch (tile.type) {
          case TileType.Grass:
          case TileType.Dirt:
            if (selectedItem.toolType === 'hoe') showAction = true;
            break;
          case TileType.TilledDirt:
            if (!tile.planted && selectedItem.toolType === 'seeds') showAction = true;
            else if (selectedItem.toolType === 'wateringCan') showAction = true;
            break;
          case TileType.PlantedDirt:
            if (selectedItem.toolType === 'wateringCan' && !tile.watered) showAction = true;
            else if (selectedItem.toolType === 'scythe' && tile.growth && tile.growth >= 1.0) showAction = true;
            break;
          case TileType.Tree:
            if (selectedItem.toolType === 'axe') showAction = true;
            break;
          case TileType.TreeStump:
            if (selectedItem.toolType === 'axe') showAction = true;
            break;
        }
        
        if (showAction) {
          this.currentTileActions.push({
            position: new Vec2(worldX, worldY),
            key: 'C'
          });
        }
      }
    }
    
    // Handle escape key to close menus
    if (this.input.isKeyPressed(Keys.Escape)) {
      let anyClosed = false;
      
      // Close inventory if open
      if (this.inventorySystem.isInventoryOpen()) {
        this.inventorySystem.toggleInventory();
        this.inventoryUI.hideInventory();
        anyClosed = true;
      }
      
      // Close shop if open
      if (this.shop.isShopOpen()) {
        this.shop.close();
        anyClosed = true;
      }
      
      // Close blacksmith if open
      if (this.blacksmith.isBlacksmithOpen()) {
        this.blacksmith.close();
        anyClosed = true;
      }
      
      // Play close sound if any menu was closed
      if (anyClosed) {
        this.audioSystem.playSound('uiClose', 0.5);
      }
    }
    
    // Handle E key - check NPC interaction first, then inventory
    if (this.input.isKeyPressed(Keys.E)) {
      if (this.shopkeeper.isNearPlayer(this.player.getPosition())) {
        // Show dialogue
        console.log(`${this.shopkeeper.name}: ${this.shopkeeper.dialogue[0]}`);
      } else {
        // Toggle inventory
        this.inventorySystem.toggleInventory();
        if (this.inventorySystem.isInventoryOpen()) {
          this.inventoryUI.showInventory();
        } else {
          this.inventoryUI.hideInventory();
        }
      }
    }
    
    // Handle F key for shop and blacksmith
    if (this.input.isKeyPressed(Keys.F)) {
      if (this.shopkeeper.isNearPlayer(this.player.getPosition())) {
        if (this.shop.isShopOpen()) {
          this.shop.close();
          this.audioSystem.playSound('uiClose', 0.5);
        } else {
          this.shop.open();
          this.audioSystem.playSound('uiOpen', 0.5);
        }
      } else if (this.blacksmithNPC.isNearPlayer(this.player.getPosition())) {
        if (this.blacksmith.isBlacksmithOpen()) {
          this.blacksmith.close();
          this.audioSystem.playSound('uiClose', 0.5);
        } else {
          this.blacksmith.open();
          this.audioSystem.playSound('uiOpen', 0.5);
        }
      }
    }
    
    // Handle tool interactions (only if inventory is closed)
    if (!this.inventorySystem.isInventoryOpen() && this.input.isKeyPressed(Keys.Space)) {
      const selectedItem = this.inventorySystem.getSelectedHotbarItem();
      if (selectedItem) {
        if ((selectedItem.type === 'tool' || selectedItem.type === 'seed') && selectedItem.toolType) {
          this.player.interact(this.tileMap, this.itemDropManager, this.audioSystem, selectedItem.toolType);
          
          // Consume seed if it was planted
          if (selectedItem.type === 'seed' && (selectedItem.toolType === 'seeds' || selectedItem.toolType === 'treeSeeds')) {
            // Check if planting was successful by checking the tile
            const playerPos = this.player.getPosition();
            const facing = this.player.getFacing();
            let targetX = playerPos.x;
            let targetY = playerPos.y;
            const interactDistance = 32;
            
            switch (facing) {
              case 'up': targetY -= interactDistance; break;
              case 'down': targetY += interactDistance; break;
              case 'left': targetX -= interactDistance; break;
              case 'right': targetX += interactDistance; break;
            }
            
            const tileX = Math.floor(targetX / 32);
            const tileY = Math.floor(targetY / 32);
            const tileBeforePlanting = this.tileMap.getTileAt(tileX, tileY);
            const wasGrass = tileBeforePlanting?.type === TileType.Grass;
            const wasTilledNotPlanted = tileBeforePlanting?.type === TileType.TilledDirt && !tileBeforePlanting.planted;
            
            // Re-fetch tile after planting attempt
            const tileAfterPlanting = this.tileMap.getTileAt(tileX, tileY);
            
            // Check if planting was successful
            let checkSuccess = false;
            if (selectedItem.toolType === 'seeds') {
              // For carrot seeds: check if tile went from tilled (not planted) to planted
              checkSuccess = wasTilledNotPlanted && tileAfterPlanting?.planted === true;
            } else if (selectedItem.toolType === 'treeSeeds') {
              // For tree seeds: check if tile went from grass to tree stump
              checkSuccess = wasGrass && tileAfterPlanting?.type === TileType.TreeStump;
            }
            
            if (checkSuccess) {
              // Seed was planted, remove one from inventory
              if (selectedItem.quantity > 1) {
                selectedItem.quantity--;
              } else {
                // Remove the item completely
                const hotbar = this.inventorySystem.getHotbar();
                const selectedIndex = this.inventorySystem.getSelectedHotbarIndex();
                hotbar[selectedIndex].item = null;
              }
              this.inventoryUI.updateHotbar();
            }
          }
        }
      }
    }
    
    // Handle mouse click for tool usage
    if (this.input.isMouseButtonPressed(0) && this.hoveredTile && !this.shop.isShopOpen() && !this.inventorySystem.isInventoryOpen()) {
      const selectedItem = this.inventorySystem.getSelectedHotbarItem();
      if (selectedItem && ((selectedItem.type === 'tool' || selectedItem.type === 'seed') && selectedItem.toolType)) {
        // Use tool at mouse position
        const worldX = this.hoveredTile.x * tileSize + tileSize/2;
        const worldY = this.hoveredTile.y * tileSize + tileSize/2;
        
        // Consume seed if it was planted
        if (selectedItem.type === 'seed' && (selectedItem.toolType === 'seeds' || selectedItem.toolType === 'treeSeeds')) {
          const tileX = Math.floor(worldX / 32);
          const tileY = Math.floor(worldY / 32);
          const tileBeforePlanting = this.tileMap.getTileAt(tileX, tileY);
          const wasGrass = tileBeforePlanting?.type === TileType.Grass;
          const wasTilledNotPlanted = tileBeforePlanting?.type === TileType.TilledDirt && !tileBeforePlanting.planted;
          
          // Use tool
          this.player.interactAt(worldX, worldY, this.tileMap, this.itemDropManager, this.audioSystem, selectedItem.toolType);
          
          // Re-fetch tile after planting attempt
          const tileAfterPlanting = this.tileMap.getTileAt(tileX, tileY);
          
          // Check if planting was successful
          let checkSuccess = false;
          if (selectedItem.toolType === 'seeds') {
            // For carrot seeds: check if tile went from tilled (not planted) to planted
            checkSuccess = wasTilledNotPlanted && tileAfterPlanting?.planted === true;
          } else if (selectedItem.toolType === 'treeSeeds') {
            // For tree seeds: check if tile went from grass to tree stump
            checkSuccess = wasGrass && tileAfterPlanting?.type === TileType.TreeStump;
          }
          
          if (checkSuccess) {
            // Seed was planted, remove one from inventory
            if (selectedItem.quantity > 1) {
              selectedItem.quantity--;
            } else {
              // Remove the item completely
              const hotbar = this.inventorySystem.getHotbar();
              const selectedIndex = this.inventorySystem.getSelectedHotbarIndex();
              hotbar[selectedIndex].item = null;
            }
            this.inventoryUI.updateHotbar();
          }
        } else {
          // For non-seed tools, just use them
          this.player.interactAt(worldX, worldY, this.tileMap, this.itemDropManager, this.audioSystem, selectedItem.toolType);
        }
      }
    }
    
    // Check for item pickups
    this.player.collectItems(this.itemDropManager, this.audioSystem, this.inventorySystem);
    
    // Shop interaction is now handled through ActionSystem
    // Auto-close shop if player walks away
    if (this.shop.isShopOpen() && !this.shopkeeper.isNearPlayer(this.player.getPosition())) {
      this.shop.close();
    }
    
    // Reset shop toggle flag when F is released
    if (!this.input.isKeyDown(Keys.F)) {
      this.shopToggled = false;
    }
    
    // Handle shop transactions when open
    if (this.shop.isShopOpen()) {
      // Buy seeds with 1
      if (this.input.isKeyPressed('Digit1')) {
        if (this.player.spendMoney(10)) {
          this.inventorySystem.addItem({
            id: 'carrot_seeds',
            name: 'Carrot Seeds',
            icon: '🥕',
            quantity: 5,
            stackable: true,
            type: 'seed',
            toolType: 'seeds'
          });
          console.log('Bought 5 seeds for 10 coins!');
          this.audioSystem.playSound('purchase', 0.6);
          this.inventoryUI.updateHotbar();
        }
      }
      // Sell carrots with 2
      if (this.input.isKeyPressed('Digit2')) {
        if (this.inventorySystem.removeItem('carrot', 1)) {
          this.player.addMoney(15);
          console.log('Sold 1 carrot for 15 coins!');
          this.audioSystem.playSound('coin', 0.5);
          this.inventoryUI.updateHotbar();
        }
      }
      // Skip tool selection while shop is open
    } else if (this.blacksmith.isBlacksmithOpen()) {
      // Handle blacksmith transactions
      // Sell wood with 1
      if (this.input.isKeyPressed('Digit1')) {
        const woodCount = this.inventorySystem.getItemCount('wood');
        if (woodCount > 0) {
          this.inventorySystem.removeItem('wood', 1);
          this.player.addMoney(5);
          console.log('Sold 1 wood for 5 coins!');
          this.audioSystem.playSound('coin', 0.4);
          this.inventoryUI.updateHotbar();
          this.updateBlacksmithUI();
        }
      }
      // Buy iron ingot with 2
      if (this.input.isKeyPressed('Digit2')) {
        if (this.player.getMoney() >= 25) {
          this.player.spendMoney(25);
          this.inventorySystem.addItem({
            id: 'iron_ingot',
            name: 'Iron Ingot',
            icon: '⚙️',
            quantity: 1,
            stackable: true,
            type: 'material'
          });
          console.log('Bought 1 iron ingot for 25 coins!');
          this.audioSystem.playSound('purchase', 0.5);
          this.inventoryUI.updateHotbar();
          this.updateBlacksmithUI();
        }
      }
      // Buy gold ingot with 3
      if (this.input.isKeyPressed('Digit3')) {
        if (this.player.getMoney() >= 100) {
          this.player.spendMoney(100);
          this.inventorySystem.addItem({
            id: 'gold_ingot',
            name: 'Gold Ingot',
            icon: '🟨',
            quantity: 1,
            stackable: true,
            type: 'material'
          });
          console.log('Bought 1 gold ingot for 100 coins!');
          this.audioSystem.playSound('purchase', 0.6);
          this.inventoryUI.updateHotbar();
          this.updateBlacksmithUI();
        }
      }
      // Skip tool selection while blacksmith is open
    } else if (!this.inventorySystem.isInventoryOpen()) {
    
    // Handle hotbar selection (only if inventory is closed)
    for (let i = 1; i <= 6; i++) {
      if (this.input.isKeyPressed(`Digit${i}`)) {
        this.inventorySystem.selectHotbarSlot(i - 1);
        this.inventoryUI.updateHotbar();
        break; // Only process one key per frame
      }
    }
    } // End of else block (shop not open)
    
    // Update crops
    this.tileMap.updateCrops(deltaTime);
    
    // Update item drops
    this.itemDropManager.update(deltaTime);
    
    // Update NPC
    this.shopkeeper.update(deltaTime);
    
    // Update camera to follow player
    this.camera.followTarget(playerPos.x, playerPos.y, 0.1);
    
    // Update UI
    this.updateUI();
    
    // Update input state at the end of the frame
    this.input.update();
  }
  
  private updateUI(): void {
    // Update position display
    const uiPlayerPos = this.player.getPosition();
    const posElement = document.getElementById('position');
    if (posElement) {
      posElement.textContent = `${Math.floor(uiPlayerPos.x)}, ${Math.floor(uiPlayerPos.y)}`;
    }
    
    // Hide old inventory display
    const inventorySlotsElement = document.getElementById('inventorySlots');
    if (inventorySlotsElement) {
      inventorySlotsElement.style.display = 'none';
    }
    
    // Update money display
    const cropCountElement = document.getElementById('cropCount');
    if (cropCountElement) {
      let statusText = `Money: ${this.player.getMoney()} coins`;
      
      // Show shop prompt if near
      if (this.shopkeeper.isNearPlayer(this.player.getPosition())) {
        statusText += ' | Press F to open shop';
      }
      
      // Show inventory hint
      statusText += ' | Press E for inventory';
      
      cropCountElement.textContent = statusText;
    }
    
    // Show shop UI if open
    this.updateShopUI();
    
    // Show blacksmith UI if open
    this.updateBlacksmithUI();
  }
  
  private updateShopUI(): void {
    let shopElement = document.getElementById('shopUI');
    
    if (this.shop.isShopOpen()) {
      if (!shopElement) {
        shopElement = document.createElement('div');
        shopElement.id = 'shopUI';
        shopElement.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.95);
          color: white;
          padding: 30px;
          border-radius: 15px;
          border: 3px solid #FFD700;
          text-align: center;
          font-size: 16px;
          z-index: 1000;
          box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
        `;
        document.body.appendChild(shopElement);
        
        // Add a single event listener that persists
        shopElement.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.id === 'buy-seeds-btn') {
            this.handleShopBuy();
          } else if (target.id === 'sell-carrot-btn') {
            this.handleShopSell();
          }
        });
      }
      
      const carrots = this.inventorySystem.getItemCount('carrot');
      
      // Only update the dynamic content, not the entire innerHTML
      if (!shopElement.querySelector('.shop-content')) {
        shopElement.innerHTML = `
          <div style="display: flex; gap: 30px; align-items: flex-start;">
            <div>
              <img src="/images/shopkeeper-1.png" style="width: 256px; height: 256px; image-rendering: pixelated; border: 3px solid #FFD700; border-radius: 8px; object-fit: cover;">
              <p style="margin-top: 10px; font-style: italic;">"Welcome to my shop!"</p>
            </div>
            <div class="shop-content" style="min-width: 250px;">
              <!-- Dynamic content goes here -->
            </div>
          </div>
        `;
      }
      
      // Update only the dynamic content
      const contentDiv = shopElement.querySelector('.shop-content');
      if (contentDiv) {
        contentDiv.innerHTML = `
          <h2>Emma's Seeds & Produce</h2>
          <div style="margin: 20px 0;">
            <p>Your money: ${this.player.getMoney()} coins</p>
            <p>Your carrots: ${carrots}</p>
          </div>
          <div style="margin: 20px 0; text-align: left;">
            <button id="buy-seeds-btn" style="
              display: block;
              width: 100%;
              padding: 12px;
              margin: 8px 0;
              background: rgba(46, 204, 113, 0.8);
              color: white;
              border: 2px solid #27ae60;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(46, 204, 113, 1)'" onmouseout="this.style.background='rgba(46, 204, 113, 0.8)'">
              [1] Buy 5 seeds - 10 coins
            </button>
            <button id="sell-carrot-btn" style="
              display: block;
              width: 100%;
              padding: 12px;
              margin: 8px 0;
              background: rgba(231, 76, 60, 0.8);
              color: white;
              border: 2px solid #c0392b;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(231, 76, 60, 1)'" onmouseout="this.style.background='rgba(231, 76, 60, 0.8)'">
              [2] Sell 1 carrot - 15 coins
            </button>
          </div>
          <p style="margin-top: 20px; font-size: 14px;">Press F to close</p>
        `;
      }
    } else if (shopElement) {
      shopElement.remove();
    }
  }
  
  private updateBlacksmithUI(): void {
    let blacksmithElement = document.getElementById('blacksmithUI');
    
    if (this.blacksmith.isBlacksmithOpen()) {
      if (!blacksmithElement) {
        blacksmithElement = document.createElement('div');
        blacksmithElement.id = 'blacksmithUI';
        blacksmithElement.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(20, 10, 0, 0.95);
          color: white;
          padding: 30px;
          border-radius: 15px;
          border: 3px solid #8B4513;
          text-align: center;
          font-size: 16px;
          z-index: 1000;
          box-shadow: 0 0 50px rgba(255, 100, 0, 0.3);
        `;
        document.body.appendChild(blacksmithElement);
        
        // Add event listener
        blacksmithElement.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.id === 'sell-wood-btn') {
            this.handleBlacksmithSellWood();
          } else if (target.id === 'buy-iron-btn') {
            this.handleBlacksmithBuyIron();
          } else if (target.id === 'buy-gold-btn') {
            this.handleBlacksmithBuyGold();
          }
        });
      }
      
      const woodCount = this.inventorySystem.getItemCount('wood');
      
      // Only update the dynamic content
      if (!blacksmithElement.querySelector('.blacksmith-content')) {
        blacksmithElement.innerHTML = `
          <div style="display: flex; gap: 30px; align-items: flex-start;">
            <div>
              <img src="/images/blacksmithguy-1.png" style="width: 256px; height: 256px; image-rendering: pixelated; border: 3px solid #8B4513; border-radius: 8px; object-fit: cover;">
              <p style="margin-top: 10px; font-style: italic;">"Need some fine metalwork?"</p>
            </div>
            <div class="blacksmith-content" style="min-width: 300px;">
              <!-- Dynamic content goes here -->
            </div>
          </div>
        `;
      }
      
      // Update only the dynamic content
      const contentDiv = blacksmithElement.querySelector('.blacksmith-content');
      if (contentDiv) {
        contentDiv.innerHTML = `
          <h2>Blacksmith's Forge</h2>
          <div style="margin: 20px 0;">
            <p>Your money: ${this.player.getMoney()} coins</p>
            <p>Your wood: ${woodCount}</p>
          </div>
          <div style="margin: 20px 0; text-align: left;">
            <button id="sell-wood-btn" style="
              display: block;
              width: 100%;
              padding: 12px;
              margin: 8px 0;
              background: rgba(139, 69, 19, 0.8);
              color: white;
              border: 2px solid #654321;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(139, 69, 19, 1)'" onmouseout="this.style.background='rgba(139, 69, 19, 0.8)'">
              [1] Sell Wood - 5 coins each
            </button>
            <button id="buy-iron-btn" style="
              display: block;
              width: 100%;
              padding: 12px;
              margin: 8px 0;
              background: rgba(70, 70, 70, 0.8);
              color: white;
              border: 2px solid #555;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(70, 70, 70, 1)'" onmouseout="this.style.background='rgba(70, 70, 70, 0.8)'">
              [2] Buy Iron Ingot - 25 coins
            </button>
            <button id="buy-gold-btn" style="
              display: block;
              width: 100%;
              padding: 12px;
              margin: 8px 0;
              background: rgba(255, 215, 0, 0.8);
              color: black;
              border: 2px solid #FFD700;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255, 215, 0, 1)'" onmouseout="this.style.background='rgba(255, 215, 0, 0.8)'">
              [3] Buy Gold Ingot - 100 coins
            </button>
          </div>
          <p style="margin-top: 20px; font-size: 14px;">Press F to close</p>
        `;
      }
    } else if (blacksmithElement) {
      blacksmithElement.remove();
    }
  }
  
  private render(): void {
    this.renderer.clear(0.2, 0.3, 0.4);
    
    const projection = this.camera.getProjectionMatrix();
    const view = this.camera.getViewMatrix();
    
    this.spriteBatch.begin(projection, view);
    
    // Render tilemap
    this.renderTileMap();
    
    // Render progress indicators
    this.renderProgressIndicators();
    
    // Render tile highlighting
    this.renderTileHighlight();
    
    // Render shop stall (behind NPC)
    this.renderShop();
    
    // Render NPCs (with explicit texture binding)
    this.renderNPC();
    
    // Render item drops
    this.renderItemDrops();
    
    // Render player last
    this.renderPlayer();
    
    // Render tile action badges
    this.tileActionRenderer.renderTileActions(this.spriteBatch, this.currentTileActions);
    
    this.spriteBatch.end();
  }
  
  private renderTileHighlight(): void {
    if (!this.hoveredTile) return;
    
    const tileSize = this.tileMap.getTileSize();
    const worldX = this.hoveredTile.x * tileSize;
    const worldY = this.hoveredTile.y * tileSize;
    
    // Get the current tool to determine highlight color
    const selectedItem = this.inventorySystem.getSelectedHotbarItem();
    let r = 1, g = 1, b = 1, a = 0.3;
    
    if (selectedItem && selectedItem.type === 'tool' && selectedItem.toolType) {
      switch (selectedItem.toolType) {
        case 'hoe':
          // Brown for tilling
          r = 0.6; g = 0.4; b = 0.2;
          break;
        case 'seeds':
          // Green for planting
          r = 0.2; g = 0.8; b = 0.2;
          break;
        case 'wateringCan':
          // Blue for watering
          r = 0.2; g = 0.4; b = 0.8;
          break;
        case 'scythe':
          // Gold for harvesting
          r = 0.8; g = 0.7; b = 0.2;
          break;
        case 'axe':
          // Orange-red for chopping
          r = 0.9; g = 0.4; b = 0.1;
          break;
      }
    }
    
    // Draw highlight outline
    this.spriteBatch.flush();
    this.whiteTexture.bind(0);
    
    const centerX = worldX + tileSize/2;
    const centerY = worldY + tileSize/2;
    
    // Set color tint for shader
    const shader = this.spriteBatch.getSpriteShader();
    shader.use();
    
    // Draw outline only
    const borderSize = 3;
    const time = performance.now() / 1000;
    const pulse = (Math.sin(time * 3) + 1) / 2;
    const alpha = 0.6 + pulse * 0.4;
    
    shader.setUniform4f('u_color', r, g, b, alpha);
    
    // Top border
    this.spriteBatch.drawTexturedQuad(centerX, worldY + borderSize/2, tileSize, borderSize);
    // Bottom border
    this.spriteBatch.drawTexturedQuad(centerX, worldY + tileSize - borderSize/2, tileSize, borderSize);
    // Left border
    this.spriteBatch.drawTexturedQuad(worldX + borderSize/2, centerY, borderSize, tileSize - borderSize * 2);
    // Right border
    this.spriteBatch.drawTexturedQuad(worldX + tileSize - borderSize/2, centerY, borderSize, tileSize - borderSize * 2);
    
    // Corner accents for better visibility
    const cornerSize = 8;
    const cornerAlpha = 0.8 + pulse * 0.2;
    shader.setUniform4f('u_color', r, g, b, cornerAlpha);
    
    // Top-left corner
    this.spriteBatch.drawTexturedQuad(worldX + cornerSize/2, worldY + borderSize/2, cornerSize, borderSize);
    this.spriteBatch.drawTexturedQuad(worldX + borderSize/2, worldY + cornerSize/2, borderSize, cornerSize);
    
    // Top-right corner
    this.spriteBatch.drawTexturedQuad(worldX + tileSize - cornerSize/2, worldY + borderSize/2, cornerSize, borderSize);
    this.spriteBatch.drawTexturedQuad(worldX + tileSize - borderSize/2, worldY + cornerSize/2, borderSize, cornerSize);
    
    // Bottom-left corner
    this.spriteBatch.drawTexturedQuad(worldX + cornerSize/2, worldY + tileSize - borderSize/2, cornerSize, borderSize);
    this.spriteBatch.drawTexturedQuad(worldX + borderSize/2, worldY + tileSize - cornerSize/2, borderSize, cornerSize);
    
    // Bottom-right corner
    this.spriteBatch.drawTexturedQuad(worldX + tileSize - cornerSize/2, worldY + tileSize - borderSize/2, cornerSize, borderSize);
    this.spriteBatch.drawTexturedQuad(worldX + tileSize - borderSize/2, worldY + tileSize - cornerSize/2, borderSize, cornerSize);
    
    // Reset color to white
    shader.setUniform4f('u_color', 1, 1, 1, 1);
  }
  
  private renderTileMap(): void {
    const tileSize = this.tileMap.getTileSize();
    const cameraPos = this.camera.getPosition();
    const zoom = this.camera.getZoom();
    
    // Calculate visible tile range with extra margin for water
    const margin = 1; // Extra tile margin
    const startX = Math.max(0, Math.floor((cameraPos.x - this.canvas.width / (2 * zoom)) / tileSize) - margin);
    const endX = Math.min(this.tileMap.getWidth(), Math.ceil((cameraPos.x + this.canvas.width / (2 * zoom)) / tileSize) + margin);
    const startY = Math.max(0, Math.floor((cameraPos.y - this.canvas.height / (2 * zoom)) / tileSize) - margin);
    const endY = Math.min(this.tileMap.getHeight(), Math.ceil((cameraPos.y + this.canvas.height / (2 * zoom)) / tileSize) + margin);
    
    // First pass: Render all water tiles with larger size
    const waterTexture = this.textures.get('water');
    if (waterTexture) {
      this.spriteBatch.flush();
      waterTexture.bind(0);
      
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tile = this.tileMap.getTileAt(x, y);
          if (tile && tile.type === TileType.Water) {
            const worldX = x * tileSize;
            const worldY = y * tileSize;
            // Render water 3 pixels larger for better coverage
            this.spriteBatch.drawTexturedQuad(
              worldX + tileSize/2, 
              worldY + tileSize/2, 
              tileSize + 3, 
              tileSize + 3
            );
          }
        }
      }
    }
    
    // Also render dirt tiles with slight overlap to prevent seams
    const dirtTexture = this.textures.get('dirt');
    if (dirtTexture) {
      this.spriteBatch.flush();
      dirtTexture.bind(0);
      
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tile = this.tileMap.getTileAt(x, y);
          if (tile && tile.type === TileType.Dirt) {
            const worldX = x * tileSize;
            const worldY = y * tileSize;
            // Render dirt 2 pixels larger to prevent seams
            this.spriteBatch.drawTexturedQuad(
              worldX + tileSize/2, 
              worldY + tileSize/2, 
              tileSize + 2, 
              tileSize + 2
            );
          }
        }
      }
    }
    
    // Second pass: Render all other tiles
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tileMap.getTileAt(x, y);
        if (!tile || tile.type === TileType.Water || tile.type === TileType.Dirt) continue;
        
        const worldX = x * tileSize;
        const worldY = y * tileSize;
        
        let texture: Texture | null = null;
        
        switch (tile.type) {
          case TileType.Grass:
            texture = this.textures.get('grass')!;
            break;
          case TileType.Stone:
            texture = this.textures.get('stone')!;
            break;
          case TileType.TilledDirt:
            texture = tile.watered ? this.textures.get('wateredDirt')! : this.textures.get('tilledDirt')!;
            break;
          case TileType.PlantedDirt:
            texture = tile.watered ? this.textures.get('wateredDirt')! : this.textures.get('tilledDirt')!;
            break;
          case TileType.Tree:
            // Render grass underneath the tree first
            texture = this.textures.get('grass')!;
            break;
          case TileType.TreeStump:
            // Render grass underneath the stump
            texture = this.textures.get('grass')!;
            break;
        }
        
        if (texture) {
          this.spriteBatch.flush();
          texture.bind(0);
          this.spriteBatch.drawTexturedQuad(worldX + tileSize/2, worldY + tileSize/2, tileSize, tileSize);
          
          // Draw plant on top if planted
          if (tile.type === TileType.PlantedDirt && tile.growth !== undefined) {
            this.spriteBatch.flush();
            
            let plantTexture: Texture;
            if (tile.growth < 0.3) {
              plantTexture = this.textures.get('plant_0.2')!;
            } else if (tile.growth < 0.7) {
              plantTexture = this.textures.get('plant_0.5')!;
            } else {
              plantTexture = this.textures.get('plant_1.0')!;
            }
            
            plantTexture.bind(0);
            this.spriteBatch.drawTexturedQuad(worldX + tileSize/2, worldY + tileSize/2, tileSize, tileSize);
          }
          
          // Draw tree on top of grass
          if (tile.type === TileType.Tree) {
            this.spriteBatch.flush();
            
            // Get the tree variant texture
            let treeTexture: Texture | undefined;
            if (tile.treeVariant && tile.treeVariant >= 1 && tile.treeVariant <= 4) {
              treeTexture = this.textures.get(`tree-${tile.treeVariant}`);
            }
            
            // Fallback to procedural tree if variant texture not found
            if (!treeTexture) {
              treeTexture = this.textures.get('tree');
            }
            
            if (treeTexture) {
              treeTexture.bind(0);
              // Make trees 1.5x larger and offset slightly up
              const treeSize = tileSize * 1.5;
              const treeOffsetY = -tileSize * 0.2; // Offset up by 20% of tile size
              this.spriteBatch.drawTexturedQuad(
                worldX + tileSize/2, 
                worldY + tileSize/2 + treeOffsetY, 
                treeSize, 
                treeSize
              );
            }
          } else if (tile.type === TileType.TreeStump) {
            // Render tree stump
            this.spriteBatch.flush();
            
            // Generate or get stump texture
            let stumpTexture = this.textures.get('stump');
            if (!stumpTexture) {
              stumpTexture = this.generateStumpTexture();
              this.textures.set('stump', stumpTexture);
            }
            
            stumpTexture.bind(0);
            this.spriteBatch.drawTexturedQuad(
              worldX + tileSize/2,
              worldY + tileSize/2,
              tileSize * 0.8,
              tileSize * 0.8
            );
          }
        }
      }
    }
    
    // Third pass: Render shoreline/edge effects
    this.renderShoreline(startX, endX, startY, endY);
  }
  
  private renderShoreline(startX: number, endX: number, startY: number, endY: number): void {
    const tileSize = this.tileMap.getTileSize();
    const shader = this.spriteBatch.getSpriteShader();
    
    // Generate a simple brown texture for shoreline
    if (!this.textures.has('shoreline')) {
      const shorelineTexture = Texture.createSolid(this.renderer.getGL(), 1, 1, 102, 76, 38); // Brown color
      this.textures.set('shoreline', shorelineTexture);
    }
    
    const shorelineTexture = this.textures.get('shoreline');
    if (!shorelineTexture) return;
    
    this.spriteBatch.flush();
    shorelineTexture.bind(0);
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tileMap.getTileAt(x, y);
        if (!tile || tile.type === TileType.Water) continue;
        
        // Check if this is a grass/dirt tile next to water
        if (tile.type === TileType.Grass || tile.type === TileType.Dirt) {
          const worldX = x * tileSize;
          const worldY = y * tileSize;
          
          // Check adjacent tiles for water
          const leftWater = x > 0 && this.tileMap.getTileAt(x - 1, y)?.type === TileType.Water;
          const rightWater = x < this.tileMap.getWidth() - 1 && this.tileMap.getTileAt(x + 1, y)?.type === TileType.Water;
          const topWater = y > 0 && this.tileMap.getTileAt(x, y - 1)?.type === TileType.Water;
          const bottomWater = y < this.tileMap.getHeight() - 1 && this.tileMap.getTileAt(x, y + 1)?.type === TileType.Water;
          
          const edgeWidth = 3; // Width of the edge effect
          
          // Draw edge lines where land meets water
          if (leftWater) {
            this.spriteBatch.drawTexturedQuad(
              worldX + edgeWidth/2, worldY + tileSize/2,
              edgeWidth, tileSize
            );
          }
          if (rightWater) {
            this.spriteBatch.drawTexturedQuad(
              worldX + tileSize - edgeWidth/2, worldY + tileSize/2,
              edgeWidth, tileSize
            );
          }
          if (topWater) {
            this.spriteBatch.drawTexturedQuad(
              worldX + tileSize/2, worldY + edgeWidth/2,
              tileSize, edgeWidth
            );
          }
          if (bottomWater) {
            this.spriteBatch.drawTexturedQuad(
              worldX + tileSize/2, worldY + tileSize - edgeWidth/2,
              tileSize, edgeWidth
            );
          }
        }
      }
    }
    
    // Flush the batch to ensure shoreline is rendered
    this.spriteBatch.flush();
  }
  
  private renderItemDrops(): void {
    const drops = this.itemDropManager.getDrops();
    
    drops.forEach(drop => {
      let texture: Texture | null = null;
      
      if (drop.itemType === 'seeds') {
        texture = this.textures.get('item_seeds') || null;
      } else if (drop.itemType === 'carrot') {
        texture = this.textures.get('item_carrot') || null;
      } else if (drop.itemType === 'wood') {
        texture = this.textures.get('item_wood') || null;
      } else if (drop.itemType === 'tree_seeds') {
        texture = this.textures.get('item_tree_seeds') || null;
      }
      
      if (texture) {
        this.spriteBatch.flush();
        texture.bind(0);
        
        // Draw with bobbing animation
        const y = drop.position.y + drop.bobOffset;
        this.spriteBatch.drawTexturedQuad(drop.position.x, y, 16, 16);
        
        // Draw quantity if more than 1
        if (drop.quantity > 1) {
          // For now, just draw multiple items slightly offset
          for (let i = 1; i < Math.min(drop.quantity, 3); i++) {
            this.spriteBatch.drawTexturedQuad(
              drop.position.x + i * 4, 
              y - i * 2, 
              16, 
              16
            );
          }
        }
      }
    });
  }
  
  private renderShop(): void {
    // Render shop stall
    const shopPos = this.shopkeeper.position;
    const stallTexture = this.textures.get('shop_stall');
    
    if (stallTexture) {
      this.spriteBatch.flush();
      stallTexture.bind(0);
      this.spriteBatch.drawTexturedQuad(shopPos.x, shopPos.y - 16, 64, 64);
      this.spriteBatch.flush();
    }
    
    // Render blacksmith forge
    const blacksmithPos = this.blacksmithNPC.position;
    const forgeTexture = this.textures.get('forge');
    
    if (forgeTexture) {
      this.spriteBatch.flush();
      forgeTexture.bind(0);
      // Render the forge building behind and slightly offset from the blacksmith
      this.spriteBatch.drawTexturedQuad(blacksmithPos.x, blacksmithPos.y - 24, 80, 80);
      this.spriteBatch.flush();
    }
  }
  
  private renderNPC(): void {
    // Render shopkeeper
    const shopPos = this.shopkeeper.position;
    const shopBobOffset = this.shopkeeper.getAnimOffset();
    
    const shopkeeperTexture = this.textures.get('shopkeeper');
    if (shopkeeperTexture) {
      this.spriteBatch.flush();
      shopkeeperTexture.bind(0);
      this.spriteBatch.drawTexturedQuad(shopPos.x, shopPos.y + shopBobOffset, 32, 32);
      this.spriteBatch.flush();
    }
    
    // Render blacksmith
    const blacksmithPos = this.blacksmithNPC.position;
    const blacksmithBobOffset = this.blacksmithNPC.getAnimOffset();
    
    const blacksmithTexture = this.textures.get('blacksmith');
    if (blacksmithTexture) {
      this.spriteBatch.flush();
      blacksmithTexture.bind(0);
      this.spriteBatch.drawTexturedQuad(blacksmithPos.x, blacksmithPos.y + blacksmithBobOffset, 32, 32);
      this.spriteBatch.flush();
    }
  }
  
  private renderPlayer(): void {
    const pos = this.player.getPosition();
    const size = this.player.getSize();
    const facing = this.player.getFacing();
    const selectedItem = this.inventorySystem.getSelectedHotbarItem();
    const animProgress = this.player.getToolAnimationProgress();
    
    // Try to use character sprite sheet
    const characterTexture = this.textures.get('character');
    if (characterTexture) {
      // Character sprite sheet is 4x4 grid
      const framesPerRow = 4;
      const totalRows = 4;
      const frameWidth = characterTexture.getWidth() / framesPerRow;
      const frameHeight = characterTexture.getHeight() / totalRows;
      
      // Determine row based on facing direction
      let row = 0;
      switch (facing) {
        case 'down': row = 0; break;
        case 'right': row = 1; break;
        case 'left': row = 3; break;   // Swapped with up
        case 'up': row = 2; break;     // Swapped with left
      }
      
      // Determine column based on animation state
      let col = 0;
      if (this.player.isPlayerMoving()) {
        // Walking animation uses columns 1-3
        const animTime = this.player.getAnimationTime();
        const frameTime = 0.2; // 200ms per frame
        const walkFrames = 3;
        col = 1 + Math.floor(animTime / frameTime) % walkFrames;
      } else {
        // Idle animation uses column 0
        col = 0;
      }
      
      // Calculate UV coordinates
      const u0 = col / framesPerRow;
      const v0 = row / totalRows;
      const u1 = (col + 1) / framesPerRow;
      const v1 = (row + 1) / totalRows;
      
      this.spriteBatch.flush();
      characterTexture.bind(0);
      
      // Render character with better proportions and slight offset
      const renderWidth = 48;  // 1.5x the sprite size
      const renderHeight = 48;
      const yOffset = -8; // Slight upward offset to align feet with tile
      
      this.spriteBatch.drawTexturedQuad(
        pos.x, pos.y + yOffset,
        renderWidth, renderHeight,
        u0, v0, u1, v1
      );
    } else {
      // Fallback to procedural texture if sprite sheet not loaded
      let toolType = undefined;
      if (selectedItem && selectedItem.toolType) {
        // Map string tool types to ToolType enum
        switch (selectedItem.toolType) {
          case 'hoe': toolType = ToolType.Hoe; break;
          case 'axe': toolType = ToolType.Axe; break;
          case 'wateringCan': toolType = ToolType.WateringCan; break;
          case 'scythe': toolType = ToolType.Scythe; break;
          case 'seeds': toolType = ToolType.Seeds; break;
        }
      }
      
      // Generate player texture with current state
      const playerTexture = this.generatePlayerTexture(facing, toolType, animProgress);
      
      this.spriteBatch.flush();
      playerTexture.bind(0);
      this.spriteBatch.drawTexturedQuad(pos.x, pos.y, size.x * 1.2, size.y * 1.2); // Slightly larger to show tools
    }
    
    // Render tool use progress if animating
    if (this.player.isAnimatingTool()) {
      const progress = this.player.getToolAnimationProgress();
      this.renderProgressBar(
        pos.x,
        pos.y - 32, // Adjusted for larger character sprite
        20,
        3,
        progress,
        { r: 1.0, g: 1.0, b: 0.0 } // Yellow for tool use
      );
    }
  }
  
  private updateFPS(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.fpsTime >= 1000) {
      const fpsElement = document.getElementById('fps');
      if (fpsElement) {
        fpsElement.textContent = this.frameCount.toString();
      }
      
      // Update soundtrack status
      const soundtrackElement = document.getElementById('soundtrack');
      if (soundtrackElement) {
        const musicStatus = this.audioSystem.getMusicStatus();
        const contextState = this.audioSystem.getAudioContextState();
        soundtrackElement.textContent = `${musicStatus} (Context: ${contextState})`;
      }
      
      this.frameCount = 0;
      this.fpsTime = currentTime;
    }
  }
  
  private renderProgressIndicators(): void {
    const tileSize = this.tileMap.getTileSize();
    const cameraPos = this.camera.getPosition();
    const zoom = this.camera.getZoom();
    
    // Calculate visible tile range
    const startX = Math.max(0, Math.floor((cameraPos.x - this.canvas.width / (2 * zoom)) / tileSize));
    const endX = Math.min(this.tileMap.getWidth(), Math.ceil((cameraPos.x + this.canvas.width / (2 * zoom)) / tileSize));
    const startY = Math.max(0, Math.floor((cameraPos.y - this.canvas.height / (2 * zoom)) / tileSize));
    const endY = Math.min(this.tileMap.getHeight(), Math.ceil((cameraPos.y + this.canvas.height / (2 * zoom)) / tileSize));
    
    // Render progress for visible tiles
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tileMap.getTileAt(x, y);
        if (!tile) continue;
        
        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;
        
        // Tree health indicator
        if (tile.type === TileType.Tree && tile.treeHealth !== undefined && tile.treeHealth < 3) {
          const progress = tile.treeHealth / 3;
          this.renderProgressBar(
            worldX, 
            worldY - tileSize / 2 - 8, 
            24, 
            4, 
            progress, 
            { r: 0.6, g: 0.3, b: 0.1 }
          );
        }
        
        // Tilled dirt reversion indicator
        if (tile.type === TileType.TilledDirt && !tile.planted && tile.tilledTime) {
          const currentTime = Date.now();
          const tillDuration = 30000; // 30 seconds
          const elapsed = currentTime - tile.tilledTime;
          const remaining = Math.max(0, tillDuration - elapsed);
          const tillProgress = remaining / tillDuration;
          
          // Show till timer as a brown bar
          this.renderProgressBar(
            worldX,
            worldY + tileSize / 2 + 4,
            20,
            2,
            tillProgress,
            { r: 0.6, g: 0.4, b: 0.2 } // Brown for dirt
          );
        }
        
        // Crop growth indicator
        if (tile.type === TileType.PlantedDirt && tile.growth !== undefined) {
          this.renderProgressBar(
            worldX, 
            worldY + tileSize / 2 + 4, 
            20, 
            3, 
            tile.growth, 
            { r: 0.2, g: 0.8, b: 0.2 }
          );
          
          // Watered status indicator
          if (tile.watered && tile.lastWatered) {
            const currentTime = Date.now();
            const waterDuration = 5000; // 5 seconds
            const elapsed = currentTime - tile.lastWatered;
            const remaining = Math.max(0, waterDuration - elapsed);
            const waterProgress = remaining / waterDuration;
            
            // Show water timer as a small blue bar
            this.renderProgressBar(
              worldX,
              worldY - tileSize / 2 - 6,
              16,
              2,
              waterProgress,
              { r: 0.2, g: 0.6, b: 1.0 } // Blue for water
            );
          }
        }
      }
    }
  }
  
  private renderProgressBar(x: number, y: number, width: number, height: number, progress: number, color: { r: number, g: number, b: number }): void {
    // Ensure progress is between 0 and 1
    progress = Math.max(0, Math.min(1, progress));
    
    // Make sure we have the white texture bound
    this.spriteBatch.flush();
    this.whiteTexture.bind(0);
    
    // Get shader and ensure it's active
    const shader = this.spriteBatch.getSpriteShader();
    shader.use();
    
    // Draw background (dark gray)
    shader.setUniform4f('u_color', 0.2, 0.2, 0.2, 0.8);
    this.spriteBatch.drawTexturedQuad(x, y, width, height);
    this.spriteBatch.flush(); // Flush to ensure color is applied
    
    // Draw progress fill
    if (progress > 0) {
      shader.setUniform4f('u_color', color.r, color.g, color.b, 0.9);
      const fillWidth = Math.max(1, (width - 2) * progress); // Account for border
      const fillX = x - width/2 + fillWidth/2 + 1; // Start from left edge + border
      this.spriteBatch.drawTexturedQuad(fillX, y, fillWidth, height - 2);
      this.spriteBatch.flush(); // Flush to ensure color is applied
    }
    
    // Draw border (very dark gray)
    shader.setUniform4f('u_color', 0.1, 0.1, 0.1, 1);
    const borderSize = 1;
    // Top
    this.spriteBatch.drawTexturedQuad(x, y - height/2 + borderSize/2, width, borderSize);
    // Bottom
    this.spriteBatch.drawTexturedQuad(x, y + height/2 - borderSize/2, width, borderSize);
    // Left
    this.spriteBatch.drawTexturedQuad(x - width/2 + borderSize/2, y, borderSize, height);
    // Right
    this.spriteBatch.drawTexturedQuad(x + width/2 - borderSize/2, y, borderSize, height);
    
    // Final flush and reset color to white
    this.spriteBatch.flush();
    shader.setUniform4f('u_color', 1, 1, 1, 1);
  }
}