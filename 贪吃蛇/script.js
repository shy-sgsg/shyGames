// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const hallButton = document.getElementById('hallButton');
const viewScoresBtn = document.getElementById('viewScoresBtn');
const settingsBtn = document.getElementById('settingsBtn');
const dpadContainer = document.getElementById('dpadContainer');

// Modals
const modalOverlay = document.getElementById('modalOverlay');
const settingsModalOverlay = document.getElementById('settingsModalOverlay');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const mobileControlsSection = document.getElementById('mobileControlsSection');


// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCIRI2D9937f3iwtCJXU6zabDMYT0R18dU",
    authDomain: "game-2048-935e4.firebaseapp.com",
    projectId: "game-2048-935e4",
    storageBucket: "game-2048-935e4.appspot.com",
    messagingSenderId: "561986111957",
    appId: "1:561986111957:web:129c25516ad68c2920d55c",
};

try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
} catch (e) { console.error("Firebase initialization failed:", e); }

const firestore = firebase.firestore ? firebase.firestore() : null;
const scoresCollection = firestore ? firestore.collection('snake_game_scores') : null;

// --- Game State & Constants ---
const gridSize = 20;
const canvasSize = 400;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;

let snake = [], food = {}, direction = 'right', score = 0;
let isPlaying = false, isPaused = false, isOfflineMode = !firestore;
let gameInterval, currentSpeed, isSubmitting = false;

// --- Settings ---
let currentTheme = 'classic';
let mobileControlMode = 'swipe'; // 'swipe' or 'dpad'
const isTouchDevice = 'ontouchstart' in window;

// --- Game Logic ---
function initGame() {
    snake = [{ x: 10, y: 10 }];
    food = generateFood();
    direction = 'right';
    score = 0;
    currentSpeed = INITIAL_SPEED;
    scoreDisplay.textContent = score;
    draw();
}

function startGame() {
    if (isPlaying) return;
    initGame();
    isPlaying = true;
    isPaused = false;
    startButton.style.display = 'none';
    pauseButton.style.display = 'inline-block';
    pauseButton.textContent = '暂停';
    gameLoop();
}

function gameLoop() {
    if (!isPlaying || isPaused) {
        clearTimeout(gameInterval);
        return;
    }
    update();
    draw();
    gameInterval = setTimeout(gameLoop, currentSpeed);
}

function update() {
    const head = { ...snake[0] };
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }

    if (head.x < 0 || head.x >= canvasSize / gridSize || head.y < 0 || head.y >= canvasSize / gridSize || checkCollision(head)) {
        endGame();
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreDisplay.textContent = score;
        food = generateFood();
        currentSpeed = Math.max(50, INITIAL_SPEED - score * SPEED_INCREMENT);
    } else {
        snake.pop();
    }
}

function endGame() {
    isPlaying = false;
    clearTimeout(gameInterval);
    startButton.style.display = 'inline-block';
    pauseButton.style.display = 'none';
    showGameOverModal(score);
}

function togglePause() {
    if (!isPlaying) return;
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? '恢复' : '暂停';
    if (!isPaused) gameLoop();
}

// --- Drawing Functions (Theme-Aware) ---
function draw() {
    const canvasBg = getComputedStyle(document.body).getPropertyValue('--canvas-bg-color');
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    drawFood();
    drawSnake();
}

function drawSnake() {
    const snakeColor = getComputedStyle(document.body).getPropertyValue('--snake-color');
    snake.forEach((segment) => {
        ctx.fillStyle = snakeColor;
        ctx.beginPath();
        ctx.roundRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2, 5);
        ctx.fill();
    });
}

function drawFood() {
    const x = food.x * gridSize;
    const y = food.y * gridSize;
    const foodColor = getComputedStyle(document.body).getPropertyValue('--food-color');
    ctx.fillStyle = foodColor;
    ctx.beginPath();

    if (currentTheme === 'ocean') { // Draw a fish
        ctx.moveTo(x + gridSize * 0.2, y + gridSize * 0.2);
        ctx.quadraticCurveTo(x + gridSize, y, x + gridSize * 0.8, y + gridSize * 0.8);
        ctx.quadraticCurveTo(x, y + gridSize, x + gridSize * 0.2, y + gridSize * 0.2);
    } else if (currentTheme === 'retro') { // Draw a pixelated cherry
        ctx.fillRect(x + 6, y + 2, 8, 8);
        ctx.fillRect(x + 2, y + 6, 8, 8);
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent-color'); // Stem
        ctx.fillRect(x + 10, y, 2, 6);
    } else { // Draw an apple
        ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
    }
    ctx.fill();
}


// --- Utility Functions ---
function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * (canvasSize / gridSize)),
            y: Math.floor(Math.random() * (canvasSize / gridSize))
        };
    } while (checkCollision(newFood, true));
    return newFood;
}

function checkCollision(head, isFoodCheck = false) {
    const body = isFoodCheck ? snake : snake.slice(1);
    return body.some(segment => head.x === segment.x && head.y === segment.y);
}

// --- Settings & Persistence ---
function setTheme(themeName) {
    currentTheme = themeName;
    document.body.className = `theme-${themeName}`;
    localStorage.setItem('snakeTheme', themeName);
    updateSettingsUI();
    draw();
}

function setMobileControls(controlMode) {
    mobileControlMode = controlMode;
    localStorage.setItem('snakeControls', controlMode);
    dpadContainer.classList.toggle('hidden', controlMode !== 'dpad');
    updateSettingsUI();
}

function updateSettingsUI() {
    // Update theme buttons
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
    // Update control buttons
    document.querySelectorAll('.control-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.control === mobileControlMode);
    });
}

function loadSettings() {
    const savedTheme = localStorage.getItem('snakeTheme') || 'classic';
    const savedControls = localStorage.getItem('snakeControls') || 'swipe';
    setTheme(savedTheme);
    if (isTouchDevice) {
        setMobileControls(savedControls);
    } else {
        mobileControlsSection.classList.add('hidden'); // Hide on non-touch devices
    }
}


// --- Modal Logic ---
function showModal(content) {
    modalOverlay.innerHTML = content;
    modalOverlay.classList.remove('hidden');
    // Re-add event listeners for new content
    modalOverlay.querySelector('.modal-close-btn')?.addEventListener('click', hideModal);
    modalOverlay.querySelector('#submitScoreBtn')?.addEventListener('click', () => {
        const playerNameInput = modalOverlay.querySelector('#playerNameInput');
        if (playerNameInput.value.trim()) {
            submitScore(score, playerNameInput.value.trim());
        } else {
            alert("请输入你的名字！");
        }
    });
    modalOverlay.querySelector('#closeScoresBtn')?.addEventListener('click', hideModal);
}

function hideModal() {
    modalOverlay.classList.add('hidden');
}

function showGameOverModal(finalScore) {
    const offlineContent = isOfflineMode ? `<p>请刷新页面以连接排行榜。</p>` : 
    `<div id="playerInfo">
        <p id="playerNameLabel">请输入你的名字:</p>
        <input type="text" id="playerNameInput" maxlength="10" placeholder="最多10个字符">
    </div>
    <div class="modal-buttons"><button id="submitScoreBtn">提交分数</button></div>`;

    const content = `
    <div class="modal-content">
        <span class="modal-close-btn">&times;</span>
        <h3 class="modal-title">游戏结束</h3>
        <p>你的分数是: <span id="finalScore">${finalScore}</span></p>
        ${offlineContent}
    </div>`;
    showModal(content);
    if (!isOfflineMode) modalOverlay.querySelector('#playerNameInput').focus();
}

function showHighScoresModal() {
    const content = `
    <div class="modal-content">
        <span class="modal-close-btn">&times;</span>
        <h3 class="modal-title">高分榜</h3>
        <ol id="highScoresListModal"><li>加载中...</li></ol>
        <div class="modal-buttons"><button id="closeScoresBtn">关闭</button></div>
    </div>`;
    showModal(content);
    loadHighScores();
}

// --- Firebase & Score Handling ---
function submitScore(newScore, playerName) { /* ... same as before ... */ }
function loadHighScores() { /* ... same as before ... */ }

// --- Event Listeners ---
// Game Controls
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
hallButton.addEventListener('click', () => window.location.href = '../index.html');
viewScoresBtn.addEventListener('click', showHighScoresModal);

// Keyboard
document.addEventListener('keydown', (e) => {
    if (!isPlaying || isPaused) return;
    const key = e.key.toLowerCase();
    if ((key === 'arrowup' || key === 'w') && direction !== 'down') direction = 'up';
    else if ((key === 'arrowdown' || key === 's') && direction !== 'up') direction = 'down';
    else if ((key === 'arrowleft' || key === 'a') && direction !== 'right') direction = 'left';
    else if ((key === 'arrowright' || key === 'd') && direction !== 'left') direction = 'right';
});

// Touch (Swipe)
let touchstartX = 0, touchstartY = 0;
canvas.addEventListener('touchstart', e => {
    if (mobileControlMode !== 'swipe') return;
    touchstartX = e.changedTouches[0].screenX;
    touchstartY = e.changedTouches[0].screenY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
    if (!isPlaying || isPaused || mobileControlMode !== 'swipe') return;
    const dx = e.changedTouches[0].screenX - touchstartX;
    const dy = e.changedTouches[0].screenY - touchstartY;
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && direction !== 'left') direction = 'right';
        else if (dx < 0 && direction !== 'right') direction = 'left';
    } else {
        if (dy > 0 && direction !== 'up') direction = 'down';
        else if (dy < 0 && direction !== 'down') direction = 'up';
    }
});

// PREVENT PAGE SCROLL ON CANVAS
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

// Touch (D-pad)
document.getElementById('dpadUp').addEventListener('click', () => { if (direction !== 'down') direction = 'up'; });
document.getElementById('dpadDown').addEventListener('click', () => { if (direction !== 'up') direction = 'down'; });
document.getElementById('dpadLeft').addEventListener('click', () => { if (direction !== 'right') direction = 'left'; });
document.getElementById('dpadRight').addEventListener('click', () => { if (direction !== 'left') direction = 'right'; });


// Modals & Settings
settingsBtn.addEventListener('click', () => settingsModalOverlay.classList.remove('hidden'));
settingsCloseBtn.addEventListener('click', () => settingsModalOverlay.classList.add('hidden'));
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideModal(); });

document.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});
document.querySelectorAll('.control-option-btn').forEach(btn => {
    btn.addEventListener('click', () => setMobileControls(btn.dataset.control));
});


// --- Initial Setup ---
window.onload = () => {
    loadSettings();
    initGame();
};