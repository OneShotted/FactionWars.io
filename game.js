const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// Create custom procedural grass texture using canvas
function createGrassTexture() {
  const size = 512;
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = size;
  grassCanvas.height = size;
  const ctx = grassCanvas.getContext('2d');

  // Base green background
  ctx.fillStyle = '#357a38'; // darker green base
  ctx.fillRect(0, 0, size, size);

  // Add random blades of grass as thin green lines
  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 6 + Math.random() * 8;
    const angle = (Math.random() - 0.5) * 0.3; // small angle variation

    ctx.strokeStyle = 'rgba(40, 140, 40, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length * Math.sin(angle), y - length * Math.cos(angle));
    ctx.stroke();
  }

  return new THREE.CanvasTexture(grassCanvas);
}

const grassTexture = createGrassTexture();
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

// For displaying usernames above players
const canvas2d = document.createElement('canvas');
canvas2d.width = 256;
canvas2d.height = 64;
const ctx2d = canvas2d.getContext('2d');

function createNameSprite(name) {
  ctx2d.clearRect(0, 0, canvas2d.width, canvas2d.height);
  ctx2d.font = 'Bold 30px Arial';
  ctx2d.fillStyle = 'white';
  ctx2d.textAlign = 'center';
  ctx2d.shadowColor = 'black';
  ctx2d.shadowBlur = 5;
  ctx2d.fillText(name, canvas2d.width / 2, 40);

  const texture = new THREE.CanvasTexture(canvas2d);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(6, 1.5, 1);
  return sprite;
}

// Other players
const otherPlayers = {}; // id -> { mesh, nameSprite, username }

// Movement state
const keysPressed = {};
document.addEventListener('keydown', (e) => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keysPressed[e.key.toLowerCase()] = false);

// WebSocket
const socket = new WebSocket('wss://factionwarsbackend.onrender.com');
let playerId = null;
let username = null;
let loggedIn = false;

// UI Elements
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
loginOverlay.style.zIndex = '9999';
document.body.appendChild(loginOverlay);

const title = document.createElement('h1');
title.textContent = 'Login or Signup';
title.style.color = 'white';
loginOverlay.appendChild(title);

const errorMsg = document.createElement('div');
errorMsg.style.color = 'red';
errorMsg.style.marginBottom = '10px';
loginOverlay.appendChild(errorMsg);

const inputUsername = document.createElement('input');
inputUsername.type = 'text';
inputUsername.placeholder = 'Username';
inputUsername.style.fontSize = '20px';
inputUsername.style.marginBottom = '10px';
loginOverlay.appendChild(inputUsername);

const inputPassword = document.createElement('input');
inputPassword.type = 'password';
inputPassword.placeholder = 'Password';
inputPassword.style.fontSize = '20px';
inputPassword.style.marginBottom = '20px';
loginOverlay.appendChild(inputPassword);

const btnLogin = document.createElement('button');
btnLogin.textContent = 'Login';
btnLogin.style.fontSize = '20px';
btnLogin.style.marginBottom = '10px';
loginOverlay.appendChild(btnLogin);

const btnSignup = document.createElement('button');
btnSignup.textContent = 'Signup';
btnSignup.style.fontSize = '20px';
loginOverlay.appendChild(btnSignup);

// Send signup message
btnSignup.onclick = () => {
  errorMsg.textContent = '';
  const u = inputUsername.value.trim();
  const p = inputPassword.value;
  if (!u || !p) {
    errorMsg.textContent = 'Please enter username and password.';
    return;
  }
  socket.send(JSON.stringify({ type: 'signup', username: u, password: p }));
};

// Send login message
btnLogin.onclick = () => {
  errorMsg.textContent = '';
  const u = inputUsername.value.trim();
  const p = inputPassword.value;
  if (!u || !p) {
    errorMsg.textContent = 'Please enter username and password.';
    return;
  }
  socket.send(JSON.stringify({ type: 'login', username: u, password: p }));
};

socket.addEventListener('open', () => {
  console.log('Connected to server');
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'signup') {
    if (data.success) {
      playerId = data.id;
      username = data.username;
      loggedIn = true;
      loginOverlay.style.display = 'none';
      localPlayer.position.set(0, 1, 0);
    } else {
      errorMsg.textContent = data.error || 'Signup failed';
    }
  }

  if (data.type === 'login') {
    if (data.success) {
      playerId = data.id;
      username = data.username;
      loggedIn = true;
      loginOverlay.style.display = 'none';
      localPlayer.position.set(0, 1, 0);
    } else {
      errorMsg.textContent = data.error || 'Login failed';
    }
  }

  if (data.type === 'update' && loggedIn) {
    Object.entries(data.players).forEach(([id, pos]) => {
      if (id === playerId) return; // Skip local player, handled locally

      if (!otherPlayers[id]) {
        const mesh = new THREE.Mesh(playerGeometry, new THREE.MeshStandardMaterial({ color: 0x00aaff }));
        scene.add(mesh);

        const nameSprite = createNameSprite(pos.username || 'Unknown');
        scene.add(nameSprite);

        otherPlayers[id] = { mesh, nameSprite, username: pos.username || 'Unknown' };
      }

      otherPlayers[id].mesh.position.set(pos.x, pos.y, pos.z);
      otherPlayers[id].mesh.rotation.y = pos.rotY || 0;

      // Update name sprite position
      const spritePos = new THREE.Vector3(pos.x, pos.y + 3, pos.z);
      otherPlayers[id].nameSprite.position.copy(spritePos);
    });

    // Remove disconnected players
    Object.keys(otherPlayers).forEach((id) => {
      if (!data.players[id]) {
        scene.remove(otherPlayers[id].mesh);
        scene.remove(otherPlayers[id].nameSprite);
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
  if (!loggedIn) {
    renderer.render(scene, camera);
    return; // Don’t move if not logged in
  }
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

  // Update local player's name sprite above box
  if (!localPlayer.nameSprite) {
    localPlayer.nameSprite = createNameSprite(username || 'You');
    scene.add(localPlayer.nameSprite);
  }
  localPlayer.nameSprite.position.copy(localPlayer.position.clone().add(new THREE.Vector3(0, 3, 0)));

  // Third-person camera
  const camOffset = forward.clone().multiplyScalar(-15).add(new THREE.Vector3(0, 10, 0));
  camera.position.copy(localPlayer.position.clone().add(camOffset));
  camera.lookAt(localPlayer.position);

  // Send position updates
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


