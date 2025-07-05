# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based 2D farming game built with TypeScript and a custom WebGL rendering engine. The game features tile-based farming mechanics, inventory management, and NPC interactions.

## Development Commands

```bash
npm run dev       # Start development server on http://localhost:3000
npm run build     # Run TypeScript checks and build for production
npm run preview   # Preview production build
npm run typecheck # Type-check without emitting files
```

## Architecture

### Engine Layer (`/src/engine/`)
Custom WebGL2 rendering engine with:
- **Renderer**: WebGL2 context management and viewport setup
- **SpriteBatch**: Efficient batched sprite rendering with vertex/index buffers
- **Shader**: GLSL shader compilation and uniform management
- **Texture**: Texture loading from images or procedural generation via Canvas 2D
- **Camera**: 2D camera with view/projection matrices
- **Input**: Keyboard and mouse input handling
- **AudioSystem**: Sound effect management with Web Audio API

### Game Layer (`/src/game/`)
Game-specific logic including:
- **Game**: Main game loop, asset loading, and render orchestration
- **TileMap**: Procedural world generation with tiles (grass, dirt, water, trees)
- **Player**: Player movement, tool usage, and inventory
- **InventorySystem**: Grid-based inventory with drag-and-drop
- **Shop**: Buy/sell system for seeds and crops
- **NPC**: Interactive characters with dialogue
- **ItemDrop**: Collectible items with physics

### Rendering Pipeline
1. Textures are procedurally generated at startup using Canvas 2D API
2. SpriteBatch accumulates draw calls and flushes when texture changes
3. Custom GLSL shaders handle sprite rendering with texture sampling
4. All coordinates use world space; camera handles view transformation

## Key Implementation Details

### Coordinate System
- World coordinates: Origin (0,0) at top-left
- Tile size: 32x32 pixels
- Player/entity positions represent their center point

### Tool System
Tools are defined in the Inventory class with specific interactions:
- **Hoe**: Till grass/dirt tiles for planting
- **Seeds**: Plant on tilled soil
- **Watering Can**: Water planted tiles to accelerate growth
- **Scythe**: Harvest mature crops
- **Axe**: Chop trees (3 hits required)

### Texture Generation
Most textures are procedurally generated at runtime using Canvas 2D:
- Player sprite with directional facing and tool animations
- Tile textures (grass, dirt, stone, water, tilled soil)
- Plant growth stages (3 stages)
- Item sprites for drops
- UI elements

### Input Handling
- WASD/Arrow keys for movement
- Shift for sprinting (1.75x speed)
- Number keys 1-5 for tool selection
- E for interact, F for shop
- Mouse for inventory management and world interaction

## Common Modifications

When adding new features:
1. **New Items**: Update InventorySystem, add texture generation, handle in item drops
2. **New Tools**: Add to ToolType enum, implement interaction in Player class
3. **New Tiles**: Add to TileType enum, generate texture, update render switch statement
4. **New NPCs**: Create NPC instance with dialogue, add interaction handling

## Type Safety
TypeScript strict mode is enabled. Always ensure:
- Proper imports for all types (common issue: missing TileType import)
- Null checks for texture/asset access
- Type annotations for event handlers and callbacks