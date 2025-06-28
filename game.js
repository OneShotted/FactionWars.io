const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// Create procedural grass texture using canvas
const grassCanvas = document.createElement('canvas');
grassCanvas.width = 256;
grassCanvas.height = 256;
const ctx = grassCanvas.getContext('2d');

// Base green fill
ctx.fillStyle = '#3a7d2d';  // grass green
ctx.fillRect(0, 0, grassCanvas.width, grassCanvas.height);

// Draw random lighter green spots for grass texture effect
for (let i = 0; i < 3000; i++) {
  const x = Math.random() * grassCanvas.width;
  const y = Math.random() * grassCanvas.height;
  const radius = Math.random() * 1.2;
  const alpha = Math.random() * 0.4 + 0.1;
  ctx.fillStyle = `rgba(70, 130, 40, ${alpha})`; // lighter green spots
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

const grassTexture = new THREE.CanvasTexture(grassCanvas);
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(200, 200);

// Then create your floor mesh like this:
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

// --- LOGIN / SIGNUP UI & LOGIC ---

const loginOverlay = document.createElement('div');
loginOverlay.style.position = 'fixed';
loginOverlay.style.top = '0';
loginOverlay.style.left = '0';
loginOverlay.style.width = '100%';
loginOverlay.style.height = '100%';
loginOverlay.style.backgroundColor = 'rgba(0,0,0,0.75)';
loginOverlay.style.display = 'flex';
loginOverlay.style.flexDirection = 'column';
loginOverlay.style.justifyContent = 'center';
loginOverlay.style.alignItems = 'center';
loginOverlay.style.zIndex = '1000';

loginOverlay.innerHTML = `
  <h2 style="color:white; margin-bottom: 20px;">Login or Sign Up</h2>
  <input id="usernameInput" placeholder="Username" style="font-size: 18px; padding: 10px; margin-bottom: 10px; width: 200px;" />
  <input id="passwordInput" type="password" placeholder="Password" style="font-size: 18px; padding: 10px; margin-bottom: 10px; width: 200px;" />
  <div style="margin-bottom: 10px; color: red;" id="loginError"></div>
  <button id="loginBtn" style="font-size: 18px; padding: 10px 20px; margin-right: 10px;">Login</button>
  <button id="signupBtn" style="font-size: 18px; padding: 10px 20px;">Sign Up</button>
`;

document.body.appendChild(loginOverlay);

const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

let loggedInUsername = null;
let playerId = null;
let gameStarted = false;

let socket = null;

function setupSocket() {
  socket = new WebSocket('wss://factionwarsbackend.onrender.com');

  socket.addEventListener('open', () => {
    console.log('Connected to server');
  });

  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'loginSuccess') {
      loggedInUsername = data.username;
      playerId = data.id;
      loginOverlay.style.display = 'none';
      startGame();
    }

    if (data.type === 'loginError' || data.type === 'signupError') {
      loginError.style.color = 'red';
      loginError.textContent = data.message;
    }

    if (data.type === 'signupSuccess') {
      loginError.style.color = 'lime';
      loginError.textContent = 'Signup successful! You can now log in.';
    }

    if (data.type === 'update' && gameStarted) {
      updatePlayers(data.players);
    }
  });
}

function sendLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    loginError.style.color = 'red';
    loginError.textContent = 'Please enter username and password.';
    return;
  }
  socket.send(JSON.stringify({ type: 'login', username, password }));
}

function sendSignup() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    loginError.style.color = 'red';
    loginError.textContent = 'Please enter username and password.';
    return;
  }
  socket.send(JSON.stringify({ type: 'signup', username, password }));
}

loginBtn.onclick = sendLogin;
signupBtn.onclick = sendSignup;

setupSocket();

// Player updates handling
function updatePlayers(playersData) {
  Object.entries(playersData).forEach(([id, pos]) => {
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
    if (!playersData[id]) {
      scene.remove(otherPlayers[id]);
      delete otherPlayers[id];
    }
  });
}

// Game start function
function startGame() {
  gameStarted = true;
  animate();
}

// Animate loop
const clock = new THREE.Clock();
let rotY = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const moveSpeed = 20 * delta;
  const rotSpeed = 2.5 * delta;

  if (!gameStarted) return;

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

  // Only send if socket open
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'move',
      id: playerId,
      username: loggedInUsername,
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


