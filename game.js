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

  // Set canvas size to full world size
  canvas.width = world.width;
  canvas.height = world.height;

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

    // Save player id on init
    if (data.type === "init") {
      playerId = data.id;
    }

    // TODO: handle other players update here
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

  ctx.fillStyle = isSelf ? playerObj.color : "#ff4d4d";
  ctx.beginPath();
  ctx.arc(playerObj.x, playerObj.y, playerObj.radius || 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(playerObj.name, playerObj.x, playerObj.y - (playerObj.radius || 20) - 10);
}

function drawWorld() {
  ctx.strokeStyle = "#333";

  for (let x = 0; x < world.width; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
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

  // Send updated position to server
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "move",
      x: player.x,
      y: player.y
    }));
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawWorld();

  updatePlayer();

  if (player) {
    drawPlayerCircle(player, true);
  }

  requestAnimationFrame(gameLoop);
}
