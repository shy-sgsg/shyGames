// 获取 HTML 元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const infoDisplay = document.getElementById('game-info').querySelector('p');
const modal = document.getElementById('scoreModal');
const finalScoreText = document.getElementById('finalScore');
const modalMessage = document.getElementById('modalMessage');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const leaderboardList = document.getElementById('leaderboard');
const leaderboardContainer = document.getElementById('leaderboardContainer');
const returnBtn = document.getElementById('returnBtn');
const pauseBtn = document.getElementById('pauseBtn');
const showLeaderboardBtn = document.getElementById('showLeaderboardBtn');

// 游戏常量 - 基础值
const BIRD_SIZE = 30;
const BIRD_X = 50;
const GRAVITY = 0.4;
const JUMP = -8;

// 动态难度参数
let PIPE_WIDTH = 40;
let PIPE_GAP = 200;
let PIPE_SPEED = 2;
let PIPE_SPACING = 300;

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
    
    PIPE_SPEED = 2 + clampedLevel * 0.3;
    PIPE_GAP = 200 - clampedLevel * 10;
    PIPE_SPACING = 300 - clampedLevel * 15;
}

// 更新游戏状态
function update() {
    if (isGameOver || !isGameStarted || isGamePaused) {
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    birdVelocity += GRAVITY;
    bird.y += birdVelocity;
    bird.draw();

    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;
    });

    drawPipes();
    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    if (bird.y + bird.size > canvas.height || bird.y < 0) {
        endGame();
    }

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
    infoDisplay.textContent = `游戏结束！你的分数是 ${score}。`;

    const isTopTen = topScores.length < 10 || score > Math.min(...topScores);

    if (isTopTen) {
        finalScoreText.textContent = `恭喜你！进入排行榜！你的分数：${score}`;
        modalMessage.textContent = '请输入您的名字：';
        playerNameInput.style.display = 'block';
        submitScoreBtn.style.display = 'block';
    } else {
        finalScoreText.textContent = `游戏结束！你的分数：${score}`;
        modalMessage.textContent = '未进入前十名，无法提交分数。';
        playerNameInput.style.display = 'none';
        submitScoreBtn.style.display = 'none';
    }
    
    modal.style.display = 'flex';
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
    infoDisplay.textContent = '点击或按空格键开始游戏';
    
    modal.style.display = 'none';
    playerNameInput.value = '';
    submitScoreBtn.disabled = false;
    
    PIPE_WIDTH = 40;
    PIPE_GAP = 200;
    PIPE_SPEED = 2;
    PIPE_SPACING = 300;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bird.draw();
}

// 暂停/继续游戏
function pauseGame() {
    if (isGameOver) {
        return;
    }

    isGamePaused = !isGamePaused;

    if (isGamePaused) {
        pauseBtn.textContent = '继续';
        infoDisplay.textContent = '游戏已暂停';
    } else {
        pauseBtn.textContent = '暂停';
        infoDisplay.textContent = '点击或按空格键跳跃！';
        update();
    }
}

// 跳跃功能
function jump() {
    if (!isGameStarted) {
        isGameStarted = true;
        infoDisplay.textContent = '点击或按空格键跳跃！';
        createPipe();
        update();
        return;
    }
    if (isGameOver) {
        resetGame();
        return;
    }
    
    birdVelocity = JUMP;
}

// 提交分数到 Firebase
async function submitScore() {
    const playerName = playerNameInput.value.trim() || '匿名玩家';
    
    submitScoreBtn.disabled = true;

    if (window.db) {
        try {
            await window.addDoc(window.collection(window.db, "flappy_bird_scores"), {
                name: playerName,
                score: score,
                timestamp: new Date()
            });
            console.log("分数已成功提交！");
            modal.style.display = 'none';
            loadLeaderboard();
            resetGame();
        } catch (e) {
            console.error("提交分数时出错: ", e);
            alert("提交分数失败，请检查网络或配置。");
        } finally {
            submitScoreBtn.disabled = false;
        }
    } else {
        alert("Firebase 未正确加载，请检查配置。");
        modal.style.display = 'none';
        resetGame();
    }
}

// 从 Firebase 加载排行榜
async function loadLeaderboard() {
    if (!window.db) return;
    try {
        const scoresRef = window.collection(window.db, "flappy_bird_scores");
        const q = window.query(scoresRef, window.orderBy("score", "desc"), window.limit(10));
        const querySnapshot = await window.getDocs(q);
        
        topScores = [];
        leaderboardList.innerHTML = '';
        querySnapshot.forEach(doc => {
            const data = doc.data();
            topScores.push(data.score);
            const li = document.createElement('li');
            li.innerHTML = `<span>${data.name}</span><span>${data.score}</span>`;
            leaderboardList.appendChild(li);
        });
    } catch (e) {
        console.error("加载排行榜时出错: ", e);
    }
}

// 切换排行榜显示状态
function toggleLeaderboard() {
    const isVisible = leaderboardContainer.style.display === 'block';
    if (isVisible) {
        leaderboardContainer.style.display = 'none';
    } else {
        leaderboardContainer.style.display = 'block';
        loadLeaderboard(); // 每次显示时都加载最新数据
    }
}

// 事件监听
canvas.addEventListener('mousedown', () => {
    // 如果游戏暂停，则继续游戏；否则，跳跃
    if (isGamePaused) {
        pauseGame();
    } else {
        jump();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        // 如果游戏暂停，则继续游戏；否则，跳跃
        if (isGamePaused) {
            pauseGame();
        } else {
            jump();
        }
    }
});

submitScoreBtn.addEventListener('click', submitScore);
pauseBtn.addEventListener('click', pauseGame);
showLeaderboardBtn.addEventListener('click', toggleLeaderboard);
returnBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
});

// 初始加载
resetGame();