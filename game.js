const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const playButton = document.getElementById('playButton');
const usernameInput = document.getElementById('usernameInput');

let socket;
let playerId = null;

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

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Add drawing logic here (player, mobs, etc.)
  requestAnimationFrame(gameLoop);
}

