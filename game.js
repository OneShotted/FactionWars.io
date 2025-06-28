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

  ctx.fillStyle = '#357a38';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 6 + Math.random() * 8;
    const angle = (Math.random() - 0.5) * 0.3;
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

// Sword for local player
const swordGeometry = new THREE.BoxGeometry(0.2, 1, 0.2);
const swordMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const localSword = new THREE.Mesh(swordGeometry, swordMaterial);
// Position sword on the right side, roughly arm length
localSword.position.set(1, 0, 0);
localSword.position.y = 0.5; // Slightly above center
localPlayer.add(localSword);

// Username sprites
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

const otherPlayers = {};
const playerHealth = {}; // Track health for players: id -> health
const ATTACK_DAMAGE = 10;
const ATTACK_COOLDOWN = 1000; // ms
let lastAttackTime = 0;

const keysPressed = {};
document.addEventListener('keydown', (e) => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keysPressed[e.key.toLowerCase()] = false);

// Attack on left click
document.addEventListener('mousedown', (e) => {
  if (!loggedIn || e.button !== 0) return; // only left click
  const now = Date.now();
  if (now - lastAttackTime < ATTACK_COOLDOWN) return; // cooldown

  const origin = localPlayer.position.clone();
  for (const id in otherPlayers) {
    const targetPos = otherPlayers[id].mesh.position;
    const distance = origin.distanceTo(targetPos);
    if (distance < 5) { // attack range
      // Send attack message to server
      socket.send(JSON.stringify({
        type: 'attack',
        targetId: id
      }));
      lastAttackTime = now;
      break; // one attack per click
    }
  }
});

// WebSocket setup
const socket = new WebSocket('wss://factionwarsbackend.onrender.com');
let playerId = null;
let username = null;
let loggedIn = false;

// Login UI
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
errorMsg.style.transition = 'opacity 1s ease';
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

// Handle signup
btnSignup.onclick = () => {
  errorMsg.textContent = '';
  errorMsg.style.opacity = '1';
  const u = inputUsername.value.trim();
  const p = inputPassword.value;
  if (!u || !p) {
    errorMsg.textContent = 'Please enter username and password.';
    return;
  }
  socket.send(JSON.stringify({ type: 'signup', username: u, password: p }));
};

// Handle login
btnLogin.onclick = () => {
  errorMsg.textContent = '';
  errorMsg.style.opacity = '1';
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
      localPlayer.position.set(0, 1, 0);
      playerHealth[playerId] = 100; // Init local player health
      errorMsg.textContent = 'Signup successful!';
      errorMsg.style.color = 'lightgreen';
      errorMsg.style.opacity = '1';
      setTimeout(() => errorMsg.style.opacity = '0', 1000);
      setTimeout(() => {
        loginOverlay.style.display = 'none';
        errorMsg.textContent = '';
        errorMsg.style.opacity = '1';
        errorMsg.style.color = 'red';
      }, 2000);
    } else {
      errorMsg.textContent = data.error || 'Signup failed';
    }
  }

  if (data.type === 'login') {
    if (data.success) {
      playerId = data.id;
      username = data.username;
      loggedIn = true;
      localPlayer.position.set(0, 1, 0);
      playerHealth[playerId] = 100; // Init local player health
      errorMsg.textContent = 'Login successful!';
      errorMsg.style.color = 'lightgreen';
      errorMsg.style.opacity = '1';
      setTimeout(() => errorMsg.style.opacity = '0', 1000);
      setTimeout(() => {
        loginOverlay.style.display = 'none';
        errorMsg.textContent = '';
        errorMsg.style.opacity = '1';
        errorMsg.style.color = 'red';
      }, 2000);
    } else {
      errorMsg.textContent = data.error || 'Login failed';
    }
  }

  if (data.type === 'update' && loggedIn) {
    Object.entries(data.players).forEach(([id, pos]) => {
      if (id === playerId) return;

      if (!otherPlayers[id]) {
        const mesh = new THREE.Mesh(playerGeometry, new THREE.MeshStandardMaterial({ color: 0x00aaff }));
        scene.add(mesh);

        const nameSprite = createNameSprite(pos.username || 'Unknown');
        scene.add(nameSprite);

        otherPlayers[id] = { mesh, nameSprite, username: pos.username || 'Unknown' };
        playerHealth[id] = 100; // Init other player health
      }

      otherPlayers[id].mesh.position.set(pos.x, pos.y, pos.z);
      otherPlayers[id].mesh.rotation.y = pos.rotY || 0;
      otherPlayers[id].nameSprite.position.set(pos.x, pos.y + 3, pos.z);
    });

    // Remove disconnected players and their health info
    Object.keys(otherPlayers).forEach((id) => {
      if (!data.players[id]) {
        scene.remove(otherPlayers[id].mesh);
        scene.remove(otherPlayers[id].nameSprite);
        delete otherPlayers[id];
        delete playerHealth[id];
      }
    });
  }

  // Handle health update messages (optional, depending on server implementation)
  if (data.type === 'healthUpdate' && loggedIn) {
    if (data.playerId && typeof data.health === 'number') {
      playerHealth[data.playerId] = data.health;
      // Optionally update health UI here
      console.log(`Player ${data.playerId} health: ${data.health}`);
    }
  }
});

// Animation loop
const clock = new THREE.Clock();
let rotY = 0;

function animate() {
  requestAnimationFrame(animate);

  if (!loggedIn) {
    renderer.render(scene, camera);
    return;
  }

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

  localPlayer.rotation.y = rotY;

  if (!localPlayer.nameSprite) {
    localPlayer.nameSprite = createNameSprite(username || 'You');
    scene.add(localPlayer.nameSprite);
  }
  localPlayer.nameSprite.position.copy(localPlayer.position.clone().add(new THREE.Vector3(0, 3, 0)));

  const camOffset = forward.clone().multiplyScalar(-15).add(new THREE.Vector3(0, 10, 0));
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


