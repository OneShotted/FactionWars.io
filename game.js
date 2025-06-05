const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const playButton = document.getElementById('playButton');
const usernameInput = document.getElementById('usernameInput');

let socket;
let playerId = null;
let player = null;
let keys = {};

const speed = 3;

let world = {
  width: 5000,
  height: 5000
};

let allPlayers = {};

playButton.onclick = () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Please enter a username.");
    return;
  }

  menu.style.display = "none";
  canvas.style.display = "block";

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  player = {
    name: username,
    x: world.width / 2,
    y: world.height / 2,
    radius: 20,
    color: "#00ffcc",
    id: null // will be set after server response
  };

  socket = new WebSocket("wss://factionwarsbackend.onrender.com");

  socket.onopen = () => {
    console.log("Connected to server");
    socket.send(JSON.stringify({ type: "join", name: username }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "init") {
      player.id = data.id;
      console.log("Assigned player id:", player.id);
    }

    if (data.type === "players") {
      allPlayers = {};
      data.players.forEach(p => {
        allPlayers[p.id] = p;
      });
    }
  };

  requestAnimationFrame(gameLoop);
};

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function drawPlayerCircle(playerObj, isSelf = false) {
  if (!playerObj) return;

  // Calculate offset to center camera on your player
  const offsetX = canvas.width / 2 - player.x;
  const offsetY = canvas.height / 2 - player.y;

  const screenX = playerObj.x + offsetX;
  const screenY = playerObj.y + offsetY;

  ctx.fillStyle = isSelf ? playerObj.color : "#ff4d4d";
  ctx.beginPath();
  ctx.arc(screenX, screenY, playerObj.radius || 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(playerObj.name, screenX, screenY - (playerObj.radius || 20) - 10);
}

function drawWorld() {
  const offsetX = canvas.width / 2 - player.x;
  const offsetY = canvas.height / 2 - player.y;

  ctx.strokeStyle = "#333";
  for (let x = 0; x < world.width; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x + offsetX, 0 + offsetY);
    ctx.lineTo(x + offsetX, world.height + offsetY);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0 + offsetX, y + offsetY);
    ctx.lineTo(world.width + offsetX, y + offsetY);
    ctx.stroke();
  }
}

function updatePlayer() {
  if (!player) return;

  if (keys["w"]) player.y -= speed;
  if (keys["s"]) player.y += speed;
  if (keys["a"]) player.x -= speed;
  if (keys["d"]) player.x += speed;

  player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));
}

function sendPosition() {
  if (socket && socket.readyState === WebSocket.OPEN && player.id) {
    socket.send(JSON.stringify({
      type: "move",
      x: player.x,
      y: player.y
    }));
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePlayer();
  sendPosition();

  drawWorld();

  for (const id in allPlayers) {
    const p = allPlayers[id];
    if (id === player.id) {
      drawPlayerCircle(player, true);
    } else {
      drawPlayerCircle(p, false);
    }
  }

  requestAnimationFrame(gameLoop);
}

