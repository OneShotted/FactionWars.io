const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

let socket;
let playerId = null;
let allPlayers = {};
let playerName = '';
let isDev = false;

// ——— INVENTORY ———
let inventory = new Array(5).fill(null);
let selectedItemIndex = null;

// ——— HTML ELEMENTS ———
const usernameScreen = document.getElementById('username-screen');
const usernameInput = document.getElementById('username-input');
const startButton = document.getElementById('start-button');
const chatContainer = document.getElementById('chat-container');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');

const devPanel = document.getElementById('dev-panel');
const devPlayerList = document.getElementById('dev-player-list');
const broadcastInput = document.getElementById('broadcast-input');
const broadcastBtn = document.getElementById('broadcast-btn');

// ——— Faction State ———
let localFaction = 'red'; // default

// ——— Autojoin Code ———
const autojoin = document.getElementById('autojoin');
const storedName = localStorage.getItem('factionwars-username');
const storedFaction = localStorage.getItem('factionwars-faction');
if (storedName) {
  usernameInput.value = storedName;
  if (storedFaction) {
    localFaction = storedFaction;
    // Pre-check the matching faction radio button:
    const factionRadios = document.getElementsByName('faction');
    factionRadios.forEach((r) => {
      if (r.value === localFaction) r.checked = true;
    });
  }
  const localAutojoin = (localStorage.getItem('factionwars-autojoin') === 'true');
  if (localAutojoin) {
    autojoin.checked = true;
    const rawName = (localStorage.getItem('factionwars-isdev') === 'true')
      ? `${storedName}#1627`
      : storedName;
    start(rawName);
  }
}

window.addEventListener('beforeunload', function() {
  localStorage.setItem('factionwars-username', playerName || usernameInput.value);
  localStorage.setItem('factionwars-isdev', isDev);
  localStorage.setItem('factionwars-autojoin', autojoin.checked);
  localStorage.setItem('factionwars-faction', localFaction);
});

// ——— Start Button Handler ———
startButton.onclick = () => {
  start(usernameInput.value.trim());
};

function start(rawName) {
  if (!rawName) return;

  // Check for “#1627” in rawName to identify dev or normal user
  if (rawName.includes('#1627')) {
    isDev = true;
    playerName = rawName.replace('#1627', '');
  } else {
    isDev = false;
    playerName = rawName;
  }

  // Read which faction radio is checked
  const factionRadios = document.getElementsByName('faction');
  factionRadios.forEach((r) => {
    if (r.checked) localFaction = r.value;
  });

  // Hide username screen, show chat and dev panel if dev
  usernameScreen.style.display = 'none';
  chatContainer.style.display = 'flex';
  devPanel.style.display = isDev ? 'block' : 'none';

  initSocket();

  // Starter items in inventory
  inventory[0] = { name: 'Basic', icon: '⚪' };
  inventory[1] = { name: 'Basic', icon: '⚪' };
  inventory[2] = { name: 'Basic', icon: '⚪' };
  inventory[3] = { name: 'Basic', icon: '⚪' };
  inventory[4] = { name: 'Basic', icon: '⚪' };
}

function stop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'leaveGame' }));
    socket.close();
  }
  usernameScreen.style.display = 'flex';
  chatContainer.style.display = 'none';
  devPanel.style.display = 'none';
  playerId = null;
  allPlayers = {};
  isDev = false;
}

// ——— Initialize WebSocket ———
function initSocket() {
  socket = new WebSocket('wss://factionwarsbackend.onrender.com');

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: 'register',
      name: playerName + (isDev ? '#1627' : ''),
      faction: localFaction
    }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'id') {
      playerId = data.id;
    }
    else if (data.type === 'update') {
      allPlayers = data.players;
      if (isDev) updateDevPanel();
    }
    else if (data.type === 'chat') {
      const msg = document.createElement('div');
      if (data.isBroadcast) {
        msg.classList.add('red-message');
        msg.textContent = data.message;
      } else {
        msg.textContent = `${data.name}: ${data.message}`;
      }
      chatLog.appendChild(msg);
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    else if (data.type === 'kicked') {
      stop();
      alert('You were kicked! Reason: ' + (data.reason || 'No reason provided.'));
    }
  };

  socket.onclose = () => {
    // Handle socket close if needed
  };

  document.getElementById('leave-game').onclick = () => {
    stop();
  };
}

// ——— Sending chat ———
sendChatBtn.onclick = () => {
  sendMsg();
};
function sendMsg() {
  const message = chatInput.value.trim();
  if (message && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'chat', message }));
    chatInput.value = '';
  }
}

// ——— Developer Panel Logic ———
function updateDevPanel() {
  devPlayerList.innerHTML = '';
  for (const id in allPlayers) {
    const p = allPlayers[id];
    const div = document.createElement('div');
    div.textContent = `${p.name} (${id})`;

    const kickBtn = document.createElement('button');
    kickBtn.textContent = 'Kick';
    kickBtn.onclick = () => {
      socket.send(JSON.stringify({
        type: 'devCommand',
        command: 'kick',
        targetId: id
      }));
    };

    const tpBtn = document.createElement('button');
    tpBtn.textContent = 'TP';
    tpBtn.onclick = () => {
      socket.send(JSON.stringify({
        type: 'devCommand',
        command: 'teleport',
        targetId: id,
        x: 100,
        y: 100
      }));
    };

    div.appendChild(kickBtn);
    div.appendChild(tpBtn);
    devPlayerList.appendChild(div);
  }
}
broadcastBtn.onclick = () => {
  const msg = broadcastInput.value.trim();
  if (msg) {
    socket.send(JSON.stringify({
      type: 'devCommand',
      command: 'broadcast',
      message: msg
    }));
    broadcastInput.value = '';
  }
};

// ——— Input (WS movement) logic ———
const keys = { up: false, down: false, left: false, right: false };
let isMouseDown = false;

document.addEventListener('keydown', (e) => {
  if (document.activeElement === chatInput) return;
  const key = e.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') keys.up = true;
  if (key === 'arrowdown' || key === 's') keys.down = true;
  if (key === 'arrowleft' || key === 'a') keys.left = true;
  if (key === 'arrowright' || key === 'd') keys.right = true;
});

document.addEventListener('keyup', (e) => {
  if (document.activeElement === chatInput) return;
  const key = e.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') keys.up = false;
  if (key === 'arrowdown' || key === 's') keys.down = false;
  if (key === 'arrowleft' || key === 'a') keys.left = false;
  if (key === 'arrowright' || key === 'd') keys.right = false;
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) isMouseDown = true;
});
canvas.addEventListener('mouseup', (e) => {
  if (e.button === 0) isMouseDown = false;
});

document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (document.activeElement === chatInput) {
      sendMsg();
      chatInput.blur();
    } else {
      chatInput.focus();
    }
  }
});

// ——— Game Loop ———
function gameLoop() {
  if (playerId && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'movementState',
      keys
    }));
  }
  requestAnimationFrame(gameLoop);
}
gameLoop();

// ——— DRAWING ———
function drawGrid(camX, camY) {
  const gridSize = 50;
  ctx.strokeStyle = 'black';
  for (let x = -camX % gridSize; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = -camY % gridSize; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function draw() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!playerId || !allPlayers[playerId]) {
    requestAnimationFrame(draw);
    return;
  }

  const me = allPlayers[playerId];
  const camX = me.x - canvas.width / 2;
  const camY = me.y - canvas.height / 2;

  // Green background
  ctx.fillStyle = '#31bd70';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid(camX, camY);

  // Draw all players
  for (const id in allPlayers) {
    const p = allPlayers[id];
    const x = p.x - camX;
    const y = p.y - camY;

    if (p.isDev) {
      // Dev player hexagon + face
      const radius = 20;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'blue';
      ctx.fill();

      // Eyes
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(x - 7, y - 5, 2, 0, Math.PI * 2);
      ctx.arc(x + 7, y - 5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Frown
      ctx.beginPath();
      ctx.arc(x, y + 10, 7, Math.PI, 0);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Colored players by faction
      if (p.faction === 'red') ctx.fillStyle = '#e74c3c';
      else if (p.faction === 'blue') ctx.fillStyle = '#3498db';
      else ctx.fillStyle = 'yellow';

      // Draw player circle
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(x - 7, y - 5, 2, 0, Math.PI * 2);
      ctx.arc(x + 7, y - 5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.beginPath();
      ctx.arc(x, y + 2, 7, 0, Math.PI);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw name above player
    ctx.fillStyle = 'black';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, x, y - 30);
  }

  // Draw inventory slots
  const slotSize = 50;
  const padding = 10;
  const startX = canvas.width / 2 - ((slotSize + padding) * inventory.length - padding) / 2;
  const yInv = canvas.height - slotSize - 10;

  for (let i = 0; i < inventory.length; i++) {
    const xSlot = startX + i * (slotSize + padding);
    ctx.fillStyle = 'white';
    ctx.fillRect(xSlot, yInv, slotSize, slotSize);
    ctx.strokeStyle = i === selectedItemIndex ? 'gold' : 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(xSlot, yInv, slotSize, slotSize);

    if (inventory[i]) {
      ctx.fillStyle = 'black';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(inventory[i].icon, xSlot + slotSize / 2, yInv + slotSize / 1.5);
    }
  }

  // Draw orbiting inventory icons around center
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const orbitRadius = isMouseDown ? 90 : 40;
  const angleStep = (Math.PI * 2) / inventory.length;
  const currentTime = Date.now() / 1000;

  for (let i = 0; i < inventory.length; i++) {
    if (!inventory[i]) continue;
    const angle = currentTime * 1.5 + i * angleStep;
    const iconX = centerX + orbitRadius * Math.cos(angle);
    const iconY = centerY + orbitRadius * Math.sin(angle);

    if (i === selectedItemIndex) {
      ctx.beginPath();
      ctx.arc(iconX, iconY, 20, 0, Math.PI * 2);
      ctx.strokeStyle = 'gold';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = 'black';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(inventory[i].icon, iconX, iconY);
  }

  requestAnimationFrame(draw);
}
draw();

// ——— Slot Click Handler ———
canvas.addEventListener('click', (e) => {
  const slotSize = 50;
  const padding = 10;
  const startX = canvas.width / 2 - ((slotSize + padding) * inventory.length - padding) / 2;
  const yInv = canvas.height - slotSize - 10;

  for (let i = 0; i < inventory.length; i++) {
    const xSlot = startX + i * (slotSize + padding);
    if (
      e.clientX >= xSlot && e.clientX <= xSlot + slotSize &&
      e.clientY >= yInv && e.clientY <= yInv + slotSize
    ) {
      selectedItemIndex = i;
      console.log('Selected:', inventory[i]);
      break; // Only select one slot per click
    }
  }
});



