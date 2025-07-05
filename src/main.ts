import './style.css';
import { Game } from './game/Game';

const app = document.getElementById('app')!;

app.innerHTML = `
  <canvas id="gameCanvas"></canvas>
  <div id="gameInfo">
    <div>FPS: <span id="fps">0</span></div>
    <div>Position: <span id="position">0, 0</span></div>
    <div>Soundtrack: <span id="soundtrack">Loading...</span></div>
    <div class="volume-control">
      <label for="musicVolume">Music Volume: </label>
      <input type="range" id="musicVolume" min="0" max="100" value="50" />
      <span id="volumeValue">50%</span>
    </div>
  </div>
  <div id="inventory">
    <div id="inventorySlots"></div>
    <div id="cropCount"></div>
  </div>
`;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const game = new Game(canvas);

game.start();