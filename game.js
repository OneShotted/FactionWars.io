const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

// Green grass floor
const floorGeometry = new THREE.PlaneGeometry(5000, 5000);
const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 15;
camera.position.z = 20;

// Local player
const playerGeometry = new THREE.BoxGeometry(2, 2, 2);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const localPlayer = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(localPlayer);

// Other players
const otherPlayers = {};

// Movement
const keysPressed = {};
document.addEventListener('keydown', (e) => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keysPressed[e.key.toLowerCase()] = false);

// WebSocket
const socket = new WebSocket('wss://factionwarsbackend.onrender.com');
let playerId = null;

socket.addEventListener('open', () => {
  console.log('Connected to server');
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'init') {
    playerId = data.id;
  }

  if (data.type === 'update') {
    Object.entries(data.players).forEach(([id, pos]) => {
      if (id === playerId) return;

      if (!otherPlayers[id]) {
        const mesh = new THREE.Mesh(playerGeometry, new THREE.MeshBasicMaterial({ color: 0x00aaff }));
        scene.add(mesh);
        otherPlayers[id] = mesh;
      }
      otherPlayers[id].position.set(pos.x, pos.y, pos.z);
    });

    // Remove disconnected players
    Object.keys(otherPlayers).forEach((id) => {
      if (!data.players[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
      }
    });
  }
});

// Update loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const speed = 15;

  if (keysPressed['w']) localPlayer.position.z -= speed * delta;
  if (keysPressed['s']) localPlayer.position.z += speed * delta;
  if (keysPressed['a']) localPlayer.position.x -= speed * delta;
  if (keysPressed['d']) localPlayer.position.x += speed * delta;

  camera.position.x = localPlayer.position.x;
  camera.position.z = localPlayer.position.z + 20;
  camera.lookAt(localPlayer.position);

  socket.send(JSON.stringify({
    type: 'move',
    position: {
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z
    }
  }));

  renderer.render(scene, camera);
}

animate();

