export class AudioSystem {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private sounds: Map<string, AudioBuffer> = new Map();
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.audioContext.destination);
    
    this.generateSounds();
  }
  
  private generateSounds(): void {
    // Generate all game sounds
    this.sounds.set('footstep1', this.generateFootstep(0.1));
    this.sounds.set('footstep2', this.generateFootstep(0.15));
    this.sounds.set('footstep3', this.generateFootstep(0.12));
    
    this.sounds.set('hoe', this.generateHoeSound());
    this.sounds.set('axe', this.generateAxeSound());
    this.sounds.set('scythe', this.generateScytheSound());
    this.sounds.set('watering', this.generateWateringSound());
    this.sounds.set('plant', this.generatePlantSound());
    
    this.sounds.set('pickup', this.generatePickupSound());
    this.sounds.set('coin', this.generateCoinSound());
    
    this.sounds.set('uiOpen', this.generateUIOpenSound());
    this.sounds.set('uiClose', this.generateUICloseSound());
    this.sounds.set('purchase', this.generatePurchaseSound());
  }
  
  private generateFootstep(variation: number): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Soft thud with variation
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Low frequency thud
      const thud = Math.sin(2 * Math.PI * (50 + variation * 100) * t) * Math.exp(-t * 30);
      // Some high frequency crunch
      const crunch = (Math.random() - 0.5) * 0.1 * Math.exp(-t * 40);
      data[i] = (thud + crunch) * 0.3;
    }
    
    return buffer;
  }
  
  private generateHoeSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Digging/scraping sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Low frequency thud
      const impact = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 15);
      // Scraping noise
      const scrape = (Math.random() - 0.5) * 0.3 * Math.exp(-t * 10) * Math.sin(2 * Math.PI * 200 * t);
      data[i] = (impact + scrape) * 0.4;
    }
    
    return buffer;
  }
  
  private generateAxeSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Sharp chop sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Initial impact
      const impact = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-t * 20);
      // Wood resonance
      const resonance = Math.sin(2 * Math.PI * 300 * t) * Math.exp(-t * 8) * 0.5;
      // Crack
      const crack = (Math.random() - 0.5) * Math.exp(-t * 50);
      data[i] = (impact + resonance + crack) * 0.6;
    }
    
    return buffer;
  }
  
  private generateScytheSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.25;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Swoosh and cut sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Swoosh
      const swoosh = Math.sin(2 * Math.PI * 400 * t * (1 + t)) * Math.exp(-t * 10);
      // Cutting sound
      const cut = (Math.random() - 0.5) * 0.2 * Math.exp(-t * 20);
      data[i] = (swoosh + cut) * 0.3;
    }
    
    return buffer;
  }
  
  private generateWateringSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.8;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Water pouring sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Base water noise
      const waterNoise = (Math.random() - 0.5) * 0.3;
      // Bubbling
      const bubble = Math.sin(2 * Math.PI * 50 * t) * Math.sin(2 * Math.PI * 3 * t);
      // Envelope
      const envelope = Math.sin(Math.PI * t / duration);
      data[i] = (waterNoise + bubble * 0.2) * envelope * 0.3;
    }
    
    return buffer;
  }
  
  private generatePlantSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Soft planting sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Soft thud
      const thud = Math.sin(2 * Math.PI * 100 * t) * Math.exp(-t * 25);
      // Rustling
      const rustle = (Math.random() - 0.5) * 0.1 * Math.exp(-t * 30);
      data[i] = (thud + rustle) * 0.25;
    }
    
    return buffer;
  }
  
  private generatePickupSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Pleasant pickup chime
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Two ascending tones
      const tone1 = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 8);
      const tone2 = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 10) * (t > 0.05 ? 1 : 0);
      data[i] = (tone1 + tone2) * 0.3;
    }
    
    return buffer;
  }
  
  private generateCoinSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Coin clink sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Metallic ring
      const ring1 = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 5);
      const ring2 = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 7) * 0.5;
      data[i] = (ring1 + ring2) * 0.4;
    }
    
    return buffer;
  }
  
  private generateUIOpenSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Whoosh open
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Rising sweep
      const sweep = Math.sin(2 * Math.PI * (200 + t * 800) * t) * Math.exp(-t * 5);
      data[i] = sweep * 0.3;
    }
    
    return buffer;
  }
  
  private generateUICloseSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Whoosh close
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Falling sweep
      const sweep = Math.sin(2 * Math.PI * (800 - t * 600) * t) * Math.exp(-t * 5);
      data[i] = sweep * 0.3;
    }
    
    return buffer;
  }
  
  private generatePurchaseSound(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Cash register cha-ching
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Two bell sounds
      const bell1 = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 4) * (t < 0.1 ? 1 : 0);
      const bell2 = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-(t - 0.1) * 4) * (t > 0.1 ? 1 : 0);
      data[i] = (bell1 + bell2) * 0.4;
    }
    
    return buffer;
  }
  
  public playSound(soundName: string, volume: number = 1.0, pitch: number = 1.0): void {
    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound "${soundName}" not found`);
      return;
    }
    
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    source.playbackRate.value = pitch;
    source.start();
  }
  
  public playFootstep(): void {
    // Randomly choose a footstep sound for variation
    const footstepIndex = Math.floor(Math.random() * 3) + 1;
    const pitch = 0.9 + Math.random() * 0.2; // Slight pitch variation
    this.playSound(`footstep${footstepIndex}`, 0.3, pitch);
  }
  
  public setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }
}