const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// Procedural grass texture generation
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
const localPlayer = new THREE.Group();

// Body (cube)
const bodyGeometry = new THREE.BoxGeometry(2, 2, 2);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
bodyMesh.position.set(0, 1, 0);
localPlayer.add(bodyMesh);

// Eyes (on front of head)
const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);

// Position eyes slightly forward so they are not hidden inside the cube
leftEye.position.set(-0.4, 2.3, 1.01);   // 1.01 to be slightly in front of cube
rightEye.position.set(0.4, 2.3, 1.01);

localPlayer.add(leftEye, rightEye);

// Arms
const armGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
const armMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });

const leftArm = new THREE.Mesh(armGeometry, armMaterial);
leftArm.position.set(-1.2, 1.5, 0);
const rightArm = new THREE.Mesh(armGeometry, armMaterial);
rightArm.position.set(1.2, 1.5, 0);
localPlayer.add(leftArm, rightArm);

// Sword
const swordGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2);
const swordMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const sword = new THREE.Mesh(swordGeometry, swordMaterial);
sword.position.set(-1.2, 0.8, 0);
localPlayer.add(sword);

scene.add(localPlayer);


// Username screen
let username = '';
let gameStarted = false;

const usernameOverlay = document.createElement('div');
usernameOverlay.style.position = 'absolute';
usernameOverlay.style.top = '0';
usernameOverlay.style.left = '0';
usernameOverlay.style.width = '100%';
usernameOverlay.style.height = '100%';
usernameOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
usernameOverlay.style.display = 'flex';
usernameOverlay.style.flexDirection = 'column';
usernameOverlay.style.justifyContent = 'center';
usernameOverlay.style.alignItems = 'center';
usernameOverlay.style.zIndex = '20';

const usernameInput = document.createElement('input');
usernameInput.placeholder = 'Enter your username';
usernameInput.style.padding = '10px';
usernameInput.style.fontSize = '20px';

const playBtn = document.createElement('button');
playBtn.innerText = 'Play';
playBtn.style.marginTop = '10px';
playBtn.style.padding = '10px 20px';
playBtn.style.fontSize = '18px';

usernameOverlay.appendChild(usernameInput);
usernameOverlay.appendChild(playBtn);
document.body.appendChild(usernameOverlay);

playBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (username.length > 0) {
    usernameOverlay.remove();
    chatBox.style.display = 'flex';
    gameStarted = true;
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'join', username }));
    }
  }
};

// Chat box
const chatBox = document.createElement('div');
chatBox.style.position = 'absolute';
chatBox.style.bottom = '10px';
chatBox.style.left = '10px';
chatBox.style.width = '300px';
chatBox.style.maxHeight = '200px';
chatBox.style.overflowY = 'auto';
chatBox.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
chatBox.style.color = 'white';
chatBox.style.padding = '10px';
chatBox.style.fontFamily = 'monospace';
chatBox.style.display = 'none';
chatBox.style.flexDirection = 'column';
chatBox.style.zIndex = '10';
document.body.appendChild(chatBox);

const chatLog = document.createElement('div');
chatBox.appendChild(chatLog);

const chatInput = document.createElement('input');
chatInput.type = 'text';
chatInput.placeholder = 'Type message...';
chatInput.style.width = '100%';
chatInput.style.marginTop = '5px';
chatInput.style.padding = '5px';
chatBox.appendChild(chatInput);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    socket.send(JSON.stringify({ type: 'chat', text: chatInput.value.trim() }));
    chatInput.value = '';
  }
  // Press Enter to focus chat input
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && gameStarted) {
    // If not already typing in chat, focus the input
    if (document.activeElement !== chatInput) {
      e.preventDefault();
      chatInput.focus();
    }
  }
});

});

// Other players
const otherPlayers = {};
const nameTags = {};

// Movement state
const keysPressed = {};
document.addEventListener('keydown', (e) => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keysPressed[e.key.toLowerCase()] = false);
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Right-click drag camera
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

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'init') {
    playerId = data.id;
  }

  if (data.type === 'update') {
    Object.entries(data.players).forEach(([id, player]) => {
      if (id === playerId) return;

      if (!otherPlayers[id]) {
        const group = new THREE.Group();

        const body = new THREE.Mesh(bodyGeometry, new THREE.MeshStandardMaterial({ color: 0x00aaff }));
        body.position.set(0, 1, 0);
        group.add(body);

        const eyeL = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eyeL.position.set(-0.25, 1.5, 0.75);
        const eyeR = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eyeR.position.set(0.25, 1.5, 0.75);
        group.add(eyeL, eyeR);

        const armL = new THREE.Mesh(armGeometry, armMaterial);
        armL.position.set(-1.2, 1.5, 0);
        const armR = new THREE.Mesh(armGeometry, armMaterial);
        armR.position.set(1.2, 1.5, 0);
        group.add(armL, armR);

        const sword = new THREE.Mesh(swordGeometry, swordMaterial);
        sword.position.set(-1.2, 0.8, 0);
        group.add(sword);

        scene.add(group);
        otherPlayers[id] = group;

        const nameTag = document.createElement('div');
        nameTag.style.position = 'absolute';
        nameTag.style.color = 'white';
        nameTag.style.fontSize = '14px';
        nameTag.style.fontWeight = 'bold';
        nameTag.innerText = player.username || 'Player';
        document.body.appendChild(nameTag);
        nameTags[id] = nameTag;
      }

      otherPlayers[id].position.set(player.x, player.y, player.z);
      otherPlayers[id].rotation.y = player.rotY || 0;

      const screenPos = otherPlayers[id].position.clone().project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
      nameTags[id].style.left = `${x}px`;
      nameTags[id].style.top = `${y}px`;
    });

    Object.keys(otherPlayers).forEach((id) => {
      if (!data.players[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
        if (nameTags[id]) {
          nameTags[id].remove();
          delete nameTags[id];
        }
      }
    });
  }

  if (data.type === 'chat') {
    const line = document.createElement('div');
    line.innerHTML = `<strong>${data.username}:</strong> ${data.text}`;
    chatLog.appendChild(line);
    chatLog.scrollTop = chatLog.scrollHeight;
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

  velocityY += gravity * delta;
  localPlayer.position.y += velocityY * delta;

  if (localPlayer.position.y <= 1) {
    localPlayer.position.y = 1;
    velocityY = 0;
    isGrounded = true;
  }
  // Border clamp (invisible island boundaries)
  const borderLimit = 400; // Adjust size of map as needed
  localPlayer.position.x = Math.max(-borderLimit, Math.min(borderLimit, localPlayer.position.x));
  localPlayer.position.z = Math.max(-borderLimit, Math.min(borderLimit, localPlayer.position.z));
  localPlayer.rotation.y = rotY;

  const camRadius = 15;
  const camHeight = 10;
  const camX = Math.sin(cameraAngle) * camRadius;
  const camZ = Math.cos(cameraAngle) * camRadius;
  camera.position.copy(localPlayer.position.clone().add(new THREE.Vector3(camX, camHeight, camZ)));
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

