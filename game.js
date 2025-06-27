const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// Textured Floor
const loader = new THREE.TextureLoader();
const grassTexture = loader.load('https://i.imgur.com/8w0IhOD.jpg');
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(200, 200);

const floorGeometry = new THREE.PlaneGeometry(10000, 10000);
const floorMaterial = new THREE.MeshStandardMaterial({ map: grassTexture });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, -15);

// Local player
const playerGeometry = new THREE.BoxGeometry(2, 2, 2);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
const localPlayer = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(localPlayer);

// Other players
const otherPlayers = {};

// Movement state
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
        const mesh = new THREE.Mesh(playerGeometry, new THREE.MeshStandardMaterial({ color: 0x00aaff }));
        scene.add(mesh);
        otherPlayers[id] = mesh;
      }
      otherPlayers[id].position.set(pos.x, pos.y, pos.z);
      otherPlayers[id].rotation.y = pos.rotY || 0;
    });

    Object.keys(otherPlayers).forEach((id) => {
      if (!data.players[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
      }
    });
  }
});

// Animate loop
const clock = new THREE.Clock();
let rotY = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const moveSpeed = 20 * delta;
  const rotSpeed = 2.5 * delta;

  // Movement: rotate + forward/backward
  if (keysPressed['a']) rotY += rotSpeed;
  if (keysPressed['d']) rotY -= rotSpeed;

  const forward = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).normalize();
  if (keysPressed['w']) {
    localPlayer.position.add(forward.clone().multiplyScalar(moveSpeed));
  }
  if (keysPressed['s']) {
    localPlayer.position.add(forward.clone().multiplyScalar(-moveSpeed));
  }

  localPlayer.rotation.y = rotY;

  // Third-person camera
  const camOffset = forward.clone().multiplyScalar(-15).add(new THREE.Vector3(0, 10, 0));
  camera.position.copy(localPlayer.position.clone().add(camOffset));
  camera.lookAt(localPlayer.position);

  // Send position
  socket.send(JSON.stringify({
    type: 'move',
    position: {
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z,
      rotY: rotY
    }
  }));

  renderer.render(scene, camera);
}

animate();

