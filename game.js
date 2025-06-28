const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// Procedural grass texture generation function
function createGrassTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3a6e3a';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 5 + Math.random() * 10;
    const angle = (Math.random() - 0.5) * 0.5;

    ctx.strokeStyle = `rgba(100, 180, 100, ${0.4 + Math.random() * 0.3})`;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length * Math.sin(angle), y - length * Math.cos(angle));
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(200, 200);
  return texture;
}

const grassTexture = createGrassTexture();

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

// Disable right-click context menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Right-click drag camera variables
let isRightMouseDown = false;
let lastMouseX = 0;
let cameraAngle = 0;

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    isRightMouseDown = true;
    lastMouseX = e.clientX;
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    isRightMouseDown = false;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isRightMouseDown) {
    const deltaX = e.clientX - lastMouseX;
    cameraAngle -= deltaX * 0.005;
    lastMouseX = e.clientX;
  }
});

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

// Jumping and gravity
let velocityY = 0;
let isGrounded = true;
const gravity = -30;
const jumpStrength = 15;

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && isGrounded) {
    velocityY = jumpStrength;
    isGrounded = false;
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

  if (keysPressed['a']) rotY += rotSpeed;
  if (keysPressed['d']) rotY -= rotSpeed;

  const forward = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).normalize();
  if (keysPressed['w']) {
    localPlayer.position.add(forward.clone().multiplyScalar(moveSpeed));
  }
  if (keysPressed['s']) {
    localPlayer.position.add(forward.clone().multiplyScalar(-moveSpeed));
  }

  // Gravity and jumping
  velocityY += gravity * delta;
  localPlayer.position.y += velocityY * delta;

  if (localPlayer.position.y <= 1) {
    localPlayer.position.y = 1;
    velocityY = 0;
    isGrounded = true;
  }

  localPlayer.rotation.y = rotY;

  // Third-person camera with orbit control
  const camRadius = 15;
  const camHeight = 10;
  const camX = Math.sin(cameraAngle) * camRadius;
  const camZ = Math.cos(cameraAngle) * camRadius;
  const camOffset = new THREE.Vector3(camX, camHeight, camZ);
  camera.position.copy(localPlayer.position.clone().add(camOffset));
  camera.lookAt(localPlayer.position);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'move',
      position: {
        x: localPlayer.position.x,
        y: localPlayer.position.y,
        z: localPlayer.position.z,
        rotY: rotY
      }
    }));
  }

  renderer.render(scene, camera);
}

animate();

