let socket;
let playerId = null;
let allPlayers = {};
let playerFaction = '';
let playerName = '';

document.querySelectorAll('.faction-button').forEach(button => {
  button.addEventListener('click', () => {
    playerFaction = button.dataset.faction;
    playerName = document.getElementById('username').value.trim();

    if (!playerName) return alert("Enter a username!");

    // Connect to server
    socket = new WebSocket('wss://factionwarsbackend.onrender.com');

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        name: playerName,
        faction: playerFaction
      }));
    };

    document.getElementById('join-screen').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
    initGameLoop();
  });
});
