const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const hallButton = document.getElementById('hallButton');
// const highScoresList = document.getElementById('highScoresList'); // 移除此行
const themeButtons = document.querySelectorAll('.theme-button');
const viewScoresBtn = document.getElementById('viewScoresBtn');

// 弹窗相关元素
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const finalScoreSpan = document.getElementById('finalScore');
const playerNameLabel = document.getElementById('playerNameLabel');
const playerNameInput = document.getElementById('playerNameInput');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const closeScoresBtn = document.getElementById('closeScoresBtn');
const gameOverContent = document.getElementById('gameOverContent');
const highScoresContent = document.getElementById('highScoresContent');
const highScoresListModal = document.getElementById('highScoresListModal');


const firebaseConfig = {
    apiKey: "AIzaSyCIRI2D9937f3iwtCJXU6zabDMYT0R18dU",
    authDomain: "game-2048-935e4.firebaseapp.com",
    projectId: "game-2048-935e4",
    storageBucket: "game-2048-935e4.appspot.com",
    messagingSenderId: "561986111957",
    appId: "1:561986111957:web:129c25516ad68c2920d55c",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();
const scoresCollection = firestore.collection('snake_game_scores');


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
let gameInterval;
let currentSpeed = INITIAL_SPEED;
let isSubmitting = false;

// 游戏初始化
function initGame() {
    clearInterval(gameInterval);
    snake = [{ x: 10, y: 10 }];
    food = generateFood();
    direction = 'right';
    score = 0;
    currentSpeed = INITIAL_SPEED;
    scoreDisplay.textContent = score;
    isPaused = false;
    startButton.style.display = 'none';
    pauseButton.style.display = 'inline-block';
    pauseButton.textContent = '暂停';
    draw(); // 首次加载，绘制初始界面
}

// 游戏循环
function gameLoop() {
    if (!isPlaying || isPaused) {
        clearTimeout(gameInterval);
        return;
    }
    update();
    draw();
    gameInterval = setTimeout(gameLoop, currentSpeed);
}

// 暂停/恢复游戏
function togglePause() {
    if (!isPlaying) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseButton.textContent = '恢复';
        clearTimeout(gameInterval);
    } else {
        pauseButton.textContent = '暂停';
        gameLoop();
    }
}

// 生成食物
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

// 绘制游戏界面
function draw() {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-bg-color');
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    drawFood();
    drawSnake();
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;

        if (index > 0) {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--snake-color');
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, gridSize - 2, gridSize - 2, 5);
            ctx.fill();
        }
        else {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--snake-color');
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, gridSize - 2, gridSize - 2, 5);
            ctx.fill();

            ctx.fillStyle = 'black';
            if (direction === 'up' || direction === 'down') {
                ctx.beginPath();
                ctx.arc(x + gridSize * 0.25, y + gridSize * 0.5, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + gridSize * 0.75, y + gridSize * 0.5, 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(x + gridSize * 0.5, y + gridSize * 0.25, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + gridSize * 0.5, y + gridSize * 0.75, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
}

function drawFood() {
    const x = food.x * gridSize;
    const y = food.y * gridSize;

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--food-color');
    ctx.beginPath();
    ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7a421b';
    ctx.beginPath();
    ctx.moveTo(x + gridSize * 0.5, y + gridSize * 0.2);
    ctx.lineTo(x + gridSize * 0.6, y);
    ctx.lineTo(x + gridSize * 0.7, y + gridSize * 0.1);
    ctx.fill();
}

// 更新游戏状态
function update() {
    const head = { x: snake[0].x, y: snake[0].y };

    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }

    if (
        head.x < 0 || head.x >= canvasSize / gridSize ||
        head.y < 0 || head.y >= canvasSize / gridSize ||
        checkCollision(head)
    ) {
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

// 检查碰撞
function checkCollision(head, isFood = false) {
    const start = isFood ? 0 : 1;
    for (let i = start; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

// 游戏结束
function endGame() {
    isPlaying = false;
    isPaused = false;
    clearTimeout(gameInterval);
    startButton.style.display = 'inline-block';
    pauseButton.style.display = 'none';

    showGameOverModal(score);
}

function submitScore(newScore, playerName) {
    if (isSubmitting) return;
    isSubmitting = true;

    scoresCollection.add({
        name: playerName,
        score: newScore,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        isSubmitting = false;
        hideModal();
    })
    .catch(error => {
        isSubmitting = false;
        console.error("提交分数失败: ", error);
        alert("提交分数失败，请稍后重试。");
    });
}

function loadHighScores() {
    scoresCollection.orderBy('score', 'desc').limit(10).get()
    .then(snapshot => {
        const scores = [];
        snapshot.forEach(doc => {
            scores.push(doc.data());
        });
        displayHighScores(scores);
    })
    .catch(error => {
        console.error("加载高分榜失败: ", error);
    });
}

function displayHighScores(scores) {
    highScoresListModal.innerHTML = '';
    scores.forEach((scoreData, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${index + 1}. ${scoreData.name}</span><span>${scoreData.score}</span>`;
        highScoresListModal.appendChild(li);
    });
}

// 主题切换
function switchTheme(theme) {
    document.body.className = `${theme}-theme`;
    themeButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
}

// ------------------- 弹窗逻辑优化 -------------------

function showModal() {
    modalOverlay.classList.add('show');
}

function hideModal() {
    modalOverlay.classList.remove('show');
}

function showGameOverModal(finalScore) {
    modalTitle.textContent = '游戏结束';
    finalScoreSpan.textContent = finalScore;
    gameOverContent.style.display = 'block';
    highScoresContent.style.display = 'none';
    submitScoreBtn.style.display = 'inline-block';
    closeScoresBtn.style.display = 'none';
    showModal();
    playerNameInput.focus();
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

// ------------------- 事件监听 -------------------
startButton.addEventListener('click', () => {
    hideModal();
    initGame();
});

pauseButton.addEventListener('click', togglePause);
hallButton.addEventListener('click', () => {
    window.location.href = '../index.html';
});

viewScoresBtn.addEventListener('click', () => {
    showHighScoresModal();
});

submitScoreBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        submitScore(score, playerName.substring(0, 10));
    } else {
        alert("请输入你的名字！");
    }
});

closeScoresBtn.addEventListener('click', hideModal);

// 处理方向键输入
function handleKeyDown(e) {
    if (isPaused) return;

    // 只有在游戏未开始时，才根据第一次按键启动游戏
    if (!isPlaying) {
        isPlaying = true;
        gameLoop();
    }

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction !== 'down') direction = 'up';
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction !== 'up') direction = 'down';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction !== 'right') direction = 'left';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction !== 'left') direction = 'right';
            break;
    }
}

document.addEventListener('keydown', handleKeyDown);

// 触摸滑动事件处理
let touchstartX = 0;
let touchstartY = 0;

canvas.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
    touchstartY = e.changedTouches[0].screenY;
});

canvas.addEventListener('touchend', e => {
    if (isPaused) return;

    // 只有在游戏未开始时，才根据第一次滑动启动游戏
    if (!isPlaying) {
        isPlaying = true;
        gameLoop();
    }

    const touchendX = e.changedTouches[0].screenX;
    const touchendY = e.changedTouches[0].screenY;

    const dx = touchendX - touchstartX;
    const dy = touchendY - touchstartY;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
        if (dx > 0 && direction !== 'left') direction = 'right';
        else if (dx < 0 && direction !== 'right') direction = 'left';
    } else {
        if (dy > 0 && direction !== 'up') direction = 'down';
        else if (dy < 0 && direction !== 'down') direction = 'up';
    }
});

themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const theme = button.dataset.theme;
        switchTheme(theme);
    });
});

// 初始状态
initGame();
switchTheme('green');