const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let selectedFaction = null;
let socket = null;

const fireBtn = document.getElementById('fire-button');
const iceBtn = document.getElementById('ice-button');
const playBtn = document.getElementById('play-button');
const usernameInput = document.getElementById('username-input');
const uiContainer = document.getElementById('ui-container');

fireBtn.addEventListener('click', () => {
  selectedFaction = 'fire';
  fireBtn.classList.add('selected');
  iceBtn.classList.remove('selected');
});

iceBtn.addEventListener('click', () => {
  selectedFaction = 'ice';
  iceBtn.classList.add('selected');
  fireBtn.classList.remove('selected');
});

playBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();

  if (!username || !selectedFaction) {
    alert("Please enter a username and select a faction.");
    return;
  }

  uiContainer.style.display = 'none';

  // Connect to WebSocket server
  socket = new WebSocket('wss://factionwarsbackend.onrender.com');

  socket.onopen = () => {
    console.log('Connected to server');

    // Send join payload
    socket.send(JSON.stringify({
      type: 'join',
      username,
      faction: selectedFaction
    }));
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log('Server says:', msg);
    // TODO: handle player data, game state, etc.
  };

  socket.onclose = () => {
    console.log('Disconnected from server');
  };

  // Placeholder drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = selectedFaction === 'fire' ? '#ff4c4c' : '#4cc9ff';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 40, 0, Math.PI * 2);
  ctx.fill();
});



