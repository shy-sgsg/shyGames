// 获取 HTML 元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const messageDisplay = document.getElementById('message');

// 弹窗和按钮
const scoreModal = document.getElementById('scoreModal');
const leaderboardModal = document.getElementById('leaderboardModal');
const finalScoreText = document.getElementById('finalScoreText');
const finalScoreTitle = document.getElementById('finalScoreTitle');
const modalMessage = document.getElementById('modalMessage');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const restartBtn = document.getElementById('restartBtn');
const submitContainer = document.getElementById('submit-container');
const retryContainer = document.getElementById('retry-container');
const closeScoreModalBtn = document.getElementById('closeScoreModalBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardList = document.getElementById('leaderboard');
const pauseBtn = document.getElementById('pauseBtn');
const showLeaderboardBtn = document.getElementById('showLeaderboardBtn');
const returnBtn = document.getElementById('returnBtn');

// 开始界面
const startScreen = document.getElementById('startScreen');
const startGameBtn = document.getElementById('startGameBtn');

// 游戏常量 - 基础值
const BIRD_SIZE = 30;
const BIRD_X = 50;
const GRAVITY = 0.4;
const JUMP = -8;

// 动态难度参数
let PIPE_WIDTH = 50;
let PIPE_GAP = 200;
let PIPE_SPEED = 2.5;
let PIPE_SPACING = 350;

// 游戏变量
let birdY = canvas.height / 2;
let birdVelocity = 0;
let pipes = [];
let score = 0;
let isGameOver = false;
let isGameStarted = false;
let isGamePaused = false;
let topScores = [];
let animationId = null;

// 小鸟对象
const bird = {
    x: BIRD_X,
    y: birdY,
    size: BIRD_SIZE,
    draw() {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
};

// 绘制水管
function drawPipes() {
    pipes.forEach(pipe => {
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top);
        ctx.fillRect(pipe.x, pipe.bottom, PIPE_WIDTH, canvas.height - pipe.bottom);
    });
}

// 生成新的水管
function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - PIPE_GAP - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight) + minHeight);
    pipes.push({
        x: canvas.width,
        top: topHeight,
        bottom: topHeight + PIPE_GAP,
        passed: false
    });
}

// 根据分数增加游戏难度
function updateDifficulty() {
    const difficultyLevel = Math.floor(score / 10);
    const maxDifficulty = 5;
    const clampedLevel = Math.min(difficultyLevel, maxDifficulty);
    
    PIPE_SPEED = 2.5 + clampedLevel * 0.4;
    PIPE_GAP = 200 - clampedLevel * 12;
    PIPE_SPACING = 350 - clampedLevel * 20;
}

// 更新游戏状态
function update() {
    if (isGameOver || !isGameStarted || isGamePaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    birdVelocity += GRAVITY;
    bird.y += birdVelocity;
    bird.draw();

    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;
    });

    drawPipes();
    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    // 碰撞检测 - 边界
    if (bird.y + bird.size > canvas.height || bird.y < 0) {
        endGame();
    }

    // 碰撞检测 - 水管
    pipes.forEach(pipe => {
        if (
            bird.x < pipe.x + PIPE_WIDTH &&
            bird.x + bird.size > pipe.x &&
            (bird.y < pipe.top || bird.y + bird.size > pipe.bottom)
        ) {
            endGame();
        }

        if (!pipe.passed && bird.x > pipe.x + PIPE_WIDTH) {
            pipe.passed = true;
            score++;
            scoreDisplay.textContent = score;
            updateDifficulty(); 
        }
    });

    if (pipes.length === 0 || canvas.width - pipes[pipes.length - 1].x >= PIPE_SPACING) {
        createPipe();
    }

    animationId = requestAnimationFrame(update);
}

// 结束游戏并显示弹窗
function endGame() {
    isGameOver = true;
    isGameStarted = false;
    cancelAnimationFrame(animationId);
    
    const isTopTen = topScores.length < 10 || score > Math.min(...topScores.map(s => s.score));

    finalScoreText.textContent = `你的分数是：${score}`;

    if (!window.isOfflineMode && isTopTen && score > 0) {
        finalScoreTitle.textContent = "恭喜！新纪录！";
        submitContainer.style.display = 'block';
        retryContainer.style.display = 'none';
    } else {
        finalScoreTitle.textContent = "游戏结束！";
        submitContainer.style.display = 'none';
        retryContainer.style.display = 'block';
    }
    
    scoreModal.style.display = 'flex';
}

// 重置游戏
function resetGame() {
    bird.y = canvas.height / 2;
    birdVelocity = 0;
    pipes = [];
    score = 0;
    isGameOver = false;
    isGameStarted = false;
    isGamePaused = false;
    scoreDisplay.textContent = score;
    messageDisplay.textContent = '点击屏幕或按空格键开始';
    
    // 关闭所有弹窗并显示开始界面
    scoreModal.style.display = 'none';
    leaderboardModal.style.display = 'none';
    startScreen.style.display = 'flex';
    
    playerNameInput.value = '';
    submitScoreBtn.disabled = false;
    
    PIPE_WIDTH = 50;
    PIPE_GAP = 200;
    PIPE_SPEED = 2.5;
    PIPE_SPACING = 350;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bird.draw();
}

// 开始游戏
function startGame() {
    if (isGameStarted) return;
    startScreen.style.display = 'none';
    isGameStarted = true;
    messageDisplay.textContent = '加油！';
    createPipe();
    update();
}

// 暂停/继续游戏
function pauseGame() {
    if (isGameOver || !isGameStarted) return;
    isGamePaused = !isGamePaused;
    if (isGamePaused) {
        pauseBtn.textContent = '继续';
        messageDisplay.textContent = '游戏已暂停';
        cancelAnimationFrame(animationId);
    } else {
        pauseBtn.textContent = '暂停';
        messageDisplay.textContent = '加油！';
        update();
    }
}

// 跳跃功能
function jump() {
    if (isGameOver || isGamePaused) return;
    if (!isGameStarted) {
        startGame();
    }
    birdVelocity = JUMP;
}

// 提交分数到 Firebase
async function submitScore() {
    if (window.isOfflineMode) return;
    const playerName = playerNameInput.value.trim() || '匿名玩家';
    submitScoreBtn.disabled = true;

    try {
        await window.addDoc(window.collection(window.db, "flappy_bird_scores"), {
            name: playerName,
            score: score,
            timestamp: new Date()
        });
        console.log("分数已成功提交！");
    } catch (e) {
        console.error("提交分数时出错: ", e);
        alert("提交失败，可能是网络问题。");
    } finally {
        scoreModal.style.display = 'none';
        resetGame();
        toggleLeaderboard(true); // 提交后自动打开排行榜
    }
}

// 从 Firebase 加载排行榜
async function loadLeaderboard() {
    if (window.isOfflineMode) return;
    try {
        const scoresRef = window.collection(window.db, "flappy_bird_scores");
        const q = window.query(scoresRef, window.orderBy("score", "desc"), window.limit(10));
        const querySnapshot = await window.getDocs(q);
        
        topScores = [];
        leaderboardList.innerHTML = '<li>正在加载...</li>';
        let content = '';
        querySnapshot.forEach(doc => {
            const data = doc.data();
            topScores.push(data);
            content += `<li><span>${data.name}</span><span>${data.score}</span></li>`;
        });
        leaderboardList.innerHTML = content || '<li>排行榜暂无数据</li>';
    } catch (e) {
        console.error("加载排行榜时出错: ", e);
        leaderboardList.innerHTML = '<li>加载失败</li>';
    }
}

// 切换排行榜显示状态
function toggleLeaderboard(show) {
    const isVisible = leaderboardModal.style.display === 'flex';
    if (show === true || !isVisible) {
        loadLeaderboard(); // 每次显示时都加载最新数据
        leaderboardModal.style.display = 'flex';
        // 如果游戏正在进行，则暂停
        if (isGameStarted && !isGamePaused && !isGameOver) {
            pauseGame();
        }
    } else {
        leaderboardModal.style.display = 'none';
    }
}

// 离线模式处理
function enterOfflineMode() {
    console.warn("正处于离线模式，排行榜功能不可用。");
    showLeaderboardBtn.style.display = 'none'; // 隐藏排行榜按钮
    messageDisplay.textContent = "离线模式";
}

// --- 事件监听 ---
canvas.addEventListener('mousedown', jump);
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // 防止页面滚动
        jump();
    }
});

startGameBtn.addEventListener('click', jump);
submitScoreBtn.addEventListener('click', submitScore);
restartBtn.addEventListener('click', resetGame);
pauseBtn.addEventListener('click', pauseGame);
showLeaderboardBtn.addEventListener('click', () => toggleLeaderboard());
closeLeaderboardBtn.addEventListener('click', () => toggleLeaderboard(false));
closeScoreModalBtn.addEventListener('click', () => {
    scoreModal.style.display = 'none';
    resetGame();
});

returnBtn.addEventListener('click', () => {
    // 根据您的项目结构，可能需要调整路径
    window.location.href = '../index.html'; 
});

// 初始加载
function initializeGame() {
    if (window.isOfflineMode) {
        enterOfflineMode();
    }
    resetGame();
    loadLeaderboard(); // 预加载排行榜数据
}

// 等待 Firebase 初始化完成
setTimeout(initializeGame, 500);