import { Vec2 } from '../utils/math';
import { Keys } from '../engine/Input';

export interface Action {
  id: string;
  name: string;
  key: string; // Display key like "E", "F", etc.
  keyCode: Keys; // Actual key code for input system
  icon?: string; // Optional icon/emoji
}

export interface Interactable {
  position: Vec2;
  getAvailableActions(): Action[];
  canInteract(playerPos: Vec2, playerFacing: string): boolean;
  performAction(actionId: string): void;
}

export class ActionIndicator {
  public position: Vec2;
  public actions: Action[];
  public opacity: number = 1; // Start visible for testing
  private targetOpacity: number = 1;
  
  constructor(position: Vec2, actions: Action[]) {
    this.position = position;
    this.actions = actions;
  }
  
  public show(): void {
    this.targetOpacity = 1;
  }
  
  public hide(): void {
    this.targetOpacity = 0;
  }
  
  public update(deltaTime: number): void {
    // Smooth fade in/out
    const fadeSpeed = 5;
    if (this.opacity < this.targetOpacity) {
      this.opacity = Math.min(this.opacity + fadeSpeed * deltaTime, this.targetOpacity);
    } else if (this.opacity > this.targetOpacity) {
      this.opacity = Math.max(this.opacity - fadeSpeed * deltaTime, this.targetOpacity);
    }
  }
  
  public isVisible(): boolean {
    return this.opacity > 0.01;
  }
}

export class ActionSystem {
  private interactables: Map<string, Interactable> = new Map();
  private currentIndicator: ActionIndicator | null = null;
  
  public registerInteractable(id: string, interactable: Interactable): void {
    this.interactables.set(id, interactable);
  }
  
  public unregisterInteractable(id: string): void {
    this.interactables.delete(id);
  }
  
  public update(playerPos: Vec2, playerFacing: string, deltaTime: number): void {
    // Find interactables the player can interact with
    let foundInteractable: Interactable | null = null;
    let foundActions: Action[] = [];
    
    for (const [id, interactable] of this.interactables) {
      if (interactable.canInteract(playerPos, playerFacing)) {
        const actions = interactable.getAvailableActions();
        if (actions.length > 0) {
          foundInteractable = interactable;
          foundActions = actions;
          break; // Take the first interactable found
        }
      }
    }
    
    if (foundInteractable && foundActions.length > 0) {
      if (!this.currentIndicator || 
          this.currentIndicator.position.x !== foundInteractable.position.x ||
          this.currentIndicator.position.y !== foundInteractable.position.y) {
        this.currentIndicator = new ActionIndicator(foundInteractable.position, foundActions);
      }
      this.currentIndicator.show();
    } else if (this.currentIndicator) {
      this.currentIndicator.hide();
    }
    
    // Update indicator animation
    if (this.currentIndicator) {
      this.currentIndicator.update(deltaTime);
      if (!this.currentIndicator.isVisible() && this.currentIndicator.targetOpacity === 0) {
        this.currentIndicator = null;
      }
    }
  }
  
  public getCurrentIndicator(): ActionIndicator | null {
    return this.currentIndicator;
  }
  
  public handleKeyPress(keyCode: Keys): boolean {
    if (!this.currentIndicator || !this.currentIndicator.isVisible()) {
      return false;
    }
    
    // Find if any action matches the pressed key
    for (const [id, interactable] of this.interactables) {
      if (interactable.canInteract(this.currentIndicator.position, '')) {
        const actions = interactable.getAvailableActions();
        const action = actions.find(a => a.keyCode === keyCode);
        if (action) {
          interactable.performAction(action.id);
          return true;
        }
      }
    }
    
    return false;
  }
}