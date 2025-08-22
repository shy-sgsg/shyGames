// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const hallButton = document.getElementById('hallButton');
const themeButtons = document.querySelectorAll('.theme-button');
const viewScoresBtn = document.getElementById('viewScoresBtn');

// Modal Elements
const modalOverlay = document.getElementById('modalOverlay');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalTitle = document.getElementById('modalTitle');
const finalScoreSpan = document.getElementById('finalScore');
const playerInfoDiv = document.getElementById('playerInfo');
const playerNameInput = document.getElementById('playerNameInput');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const closeScoresBtn = document.getElementById('closeScoresBtn');
const gameOverContent = document.getElementById('gameOverContent');
const highScoresContent = document.getElementById('highScoresContent');
const highScoresListModal = document.getElementById('highScoresListModal');

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
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

const firestore = firebase.firestore ? firebase.firestore() : null;
const scoresCollection = firestore ? firestore.collection('snake_game_scores') : null;

// --- Game State & Constants ---
const gridSize = 20;
const canvasSize = 400;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;

let snake = [];
let food = {};
let direction = 'right';
let score = 0;
let isPlaying = false;
let isPaused = false;
let isOfflineMode = !firestore; // Start in offline mode if firestore fails to init
let gameInterval;
let currentSpeed;
let isSubmitting = false;

// --- Game Logic ---
function initGame() {
    snake = [{ x: 10, y: 10 }];
    food = generateFood();
    direction = 'right';
    score = 0;
    currentSpeed = INITIAL_SPEED;
    scoreDisplay.textContent = score;
    draw(); // Draw the initial state of the game board
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
    const head = { x: snake[0].x, y: snake[0].y };
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

// --- Drawing Functions ---
function draw() {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg-color');
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    drawFood();
    drawSnake();
}

function drawSnake() {
    const snakeColor = getComputedStyle(document.documentElement).getPropertyValue('--snake-color');
    snake.forEach((segment, index) => {
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        ctx.fillStyle = snakeColor;
        ctx.beginPath();
        // Use roundRect for smoother snake body
        ctx.roundRect(x, y, gridSize, gridSize, 5);
        ctx.fill();

        // Draw eyes on the head
        if (index === 0) {
            ctx.fillStyle = 'white';
            const eyeSize = 3;
            const eyeOffsetX = direction === 'left' || direction === 'right' ? 0.25 : 0.5;
            const eyeOffsetY = direction === 'up' || direction === 'down' ? 0.25 : 0.5;

            ctx.beginPath();
            ctx.arc(x + gridSize * eyeOffsetX, y + gridSize * eyeOffsetY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + gridSize * (1 - eyeOffsetX), y + gridSize * (1 - eyeOffsetY), eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawFood() {
    const x = food.x * gridSize;
    const y = food.y * gridSize;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--food-color');
    ctx.beginPath();
    ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
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

function switchTheme(theme) {
    document.body.className = `${theme}-theme`;
    themeButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    draw(); // Redraw with new theme colors
}

// --- Firebase & Score Handling ---
function submitScore(newScore, playerName) {
    if (isSubmitting || isOfflineMode) return;
    isSubmitting = true;
    submitScoreBtn.textContent = '提交中...';

    scoresCollection.add({
        name: playerName,
        score: newScore,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        hideModal();
    })
    .catch(error => {
        console.error("Score submission failed: ", error);
        alert("提交失败，请检查网络后重试。");
    })
    .finally(() => {
        isSubmitting = false;
        submitScoreBtn.textContent = '提交分数';
    });
}

function loadHighScores() {
    if (isOfflineMode) {
        highScoresListModal.innerHTML = '<li>排行榜当前不可用。</li>';
        return;
    }
    
    highScoresListModal.innerHTML = '<li>加载中...</li>';
    scoresCollection.orderBy('score', 'desc').limit(10).get()
    .then(snapshot => {
        if (snapshot.empty) {
            highScoresListModal.innerHTML = '<li>还没有人上榜，快来争夺第一！</li>';
            return;
        }
        highScoresListModal.innerHTML = '';
        snapshot.forEach((doc, index) => {
            const scoreData = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${index + 1}. ${scoreData.name}</span><span>${scoreData.score}</span>`;
            highScoresListModal.appendChild(li);
        });
    })
    .catch(error => {
        console.error("Failed to load high scores: ", error);
        isOfflineMode = true; // Switch to offline mode on failure
        highScoresListModal.innerHTML = '<li>无法加载排行榜。</li>';
    });
}

// --- Modal Logic ---
function showModal() {
    modalOverlay.classList.add('show');
}

function hideModal() {
    modalOverlay.classList.remove('show');
}

function showGameOverModal(finalScore) {
    modalTitle.textContent = '游戏结束';
    finalScoreSpan.textContent = finalScore;
    
    // Show or hide score submission fields based on offline status
    playerInfoDiv.style.display = isOfflineMode ? 'none' : 'block';
    submitScoreBtn.style.display = isOfflineMode ? 'none' : 'inline-block';
    
    gameOverContent.style.display = 'block';
    highScoresContent.style.display = 'none';
    closeScoresBtn.style.display = 'none';
    playerNameInput.value = '';
    showModal();
    if (!isOfflineMode) playerNameInput.focus();
}

function showHighScoresModal() {
    modalTitle.textContent = '高分榜';
    gameOverContent.style.display = 'none';
    highScoresContent.style.display = 'block';
    submitScoreBtn.style.display = 'none';
    closeScoresBtn.style.display = 'inline-block';
    loadHighScores();
    showModal();
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
hallButton.addEventListener('click', () => {
    window.location.href = '../index.html'; // Adjust path if needed
});
viewScoresBtn.addEventListener('click', showHighScoresModal);

submitScoreBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        submitScore(score, playerName);
    } else {
        alert("请输入你的名字！");
    }
});

// Modal closing events
closeScoresBtn.addEventListener('click', hideModal);
modalCloseBtn.addEventListener('click', hideModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!isPlaying || isPaused) return;
    const key = e.key.toLowerCase();
    if ((key === 'arrowup' || key === 'w') && direction !== 'down') direction = 'up';
    else if ((key === 'arrowdown' || key === 's') && direction !== 'up') direction = 'down';
    else if ((key === 'arrowleft' || key === 'a') && direction !== 'right') direction = 'left';
    else if ((key === 'arrowright' || key === 'd') && direction !== 'left') direction = 'right';
});

// Touch controls
let touchstartX = 0;
let touchstartY = 0;
canvas.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
    touchstartY = e.changedTouches[0].screenY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
    if (!isPlaying || isPaused) return;
    const touchendX = e.changedTouches[0].screenX;
    const touchendY = e.changedTouches[0].screenY;
    const dx = touchendX - touchstartX;
    const dy = touchendY - touchstartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && direction !== 'left') direction = 'right';
        else if (dx < 0 && direction !== 'right') direction = 'left';
    } else {
        if (dy > 0 && direction !== 'up') direction = 'down';
        else if (dy < 0 && direction !== 'down') direction = 'up';
    }
});

themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        switchTheme(button.dataset.theme);
    });
});

// --- Initial Setup ---
window.onload = () => {
    initGame();
    switchTheme('green');
};