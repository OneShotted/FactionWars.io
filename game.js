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
    color: "#00ffcc"
  };

  socket = new WebSocket("wss://factionwarsbackend.onrender.com");

  socket.onopen = () => {
    console.log("Connected to server");
    socket.send(JSON.stringify({ type: "join", name: username }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
  };

  requestAnimationFrame(gameLoop);
};

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function drawPlayer() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.name, centerX, centerY - player.radius - 10);
}

function drawWorld() {
  // Simulate a world grid for reference
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

  // Clamp to world bounds
  player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePlayer();

  if (player) {
    drawWorld();
    drawPlayer();
  }

  requestAnimationFrame(gameLoop);
}

