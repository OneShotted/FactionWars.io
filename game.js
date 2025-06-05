const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let socket = new WebSocket("wss://factionwars-backend.onrender.com");

socket.onopen = () => {
  console.log("Connected to server");
  socket.send(JSON.stringify({ type: "join", name: "Player" + Math.floor(Math.random() * 1000) }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  requestAnimationFrame(gameLoop);
}
gameLoop();

