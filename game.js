const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const playButton = document.getElementById('playButton');
const usernameInput = document.getElementById('usernameInput');

let socket;
let playerId = null;
let player = null;

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
    x: canvas.width / 2,
    y: canvas.height / 2,
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

function drawPlayer(p) {
  // Draw the circle
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw the name
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(p.name, p.x, p.y - p.radius - 10);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (player) {
    drawPlayer(player);
  }

  requestAnimationFrame(gameLoop);
}


