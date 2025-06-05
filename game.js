const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let selectedFaction = null;
let socket = null;
let playerId = null;
let players = {};

const keys = { w: false, a: false, s: false, d: false };

document.addEventListener('keydown', (e) => {
  if (e.key in keys) keys[e.key] = true;
});
document.addEventListener('keyup', (e) => {
  if (e.key in keys) keys[e.key] = false;
});

document.getElementById('fire-button').addEventListener('click', () => {
  selectedFaction = 'fire';
  toggleSelection('fire');
});
document.getElementById('ice-button').addEventListener('click', () => {
  selectedFaction = 'ice';
  toggleSelection('ice');
});

function toggleSelection(faction) {
  document.getElementById('fire-button').classList.toggle('selected', faction === 'fire');
  document.getElementById('ice-button').classList.toggle('selected', faction === 'ice');
}

document.getElementById('play-button').addEventListener('click', () => {
  const username = document.getElementById('username-input').value.trim();
  if (!username || !selectedFaction) {
    alert("Please enter a username and select a faction.");
    return;
  }

  document.getElementById('ui-container').style.display = 'none';

  socket = new WebSocket('wss://factionwarsbackend.onrender.com');

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: 'join',
      username,
      faction: selectedFaction
    }));
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'init') {
      playerId = msg.id;
    }
    if (msg.type === 'state') {
      players = msg.players;
    }
  };

  socket.onclose = () => console.log('Disconnected');

  requestAnimationFrame(gameLoop);
});

function drawGrid(centerX, centerY) {
  const gridSize = 50;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;

  const offsetX = -centerX + canvas.width / 2;
  const offsetY = -centerY + canvas.height / 2;

  const startX = -offsetX % gridSize;
  const startY = -offsetY % gridSize;

  for (let x = startX; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = startY; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!playerId || !players[playerId]) {
    requestAnimationFrame(gameLoop);
    return;
  }

  const me = players[playerId];

  // Send keys
  socket.send(JSON.stringify({ type: 'move', keys }));

  // Camera follows player
  const camX = me.x;
  const camY = me.y;

  drawGrid(camX, camY);

  for (let id in players) {
    const p = players[id];
    const screenX = canvas.width / 2 + (p.x - camX);
    const screenY = canvas.height / 2 + (p.y - camY);

    ctx.fillStyle = p.faction === 'fire' ? '#ff4c4c' : '#4cc9ff';
    ctx.beginPath();
    ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.username, screenX, screenY - 30);
  }

  requestAnimationFrame(gameLoop);
}

