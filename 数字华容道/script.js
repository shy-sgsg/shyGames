// 由于现在从 CDN 加载 Firebase，不再需要 import 语句

// Firebase 配置信息 (请替换成你自己的)
const firebaseConfig = {
    apiKey: "AIzaSyCIRI2D9937f3iwtCJXU6zabDMYT0R18dU",
    authDomain: "game-2048-935e4.firebaseapp.com",
    projectId: "game-2048-935e4",
    storageBucket: "game-2048-935e4.appspot.com",
    messagingSenderId: "561986111957",
    appId: "1:561986111957:web:129c25516ad68c2920d55c"
};

let db = null;
let leaderboardCollection = null;
let isOfflineMode = false;

// 尝试初始化 Firebase，如果失败则进入离线模式
try {
    // 使用全局可用的 firebase 变量
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    // 使用独立的排行榜集合，避免与2048游戏冲突
    leaderboardCollection = db.collection("fifteen_puzzle_leaderboard");
    console.log("Firebase 数据库已成功连接。");
} catch (e) {
    console.error("Firebase 数据库连接失败，游戏将进入离线模式。", e);
    isOfflineMode = true;
}

document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const movesCountSpan = document.getElementById('moves-count');
    const timerSpan = document = document.getElementById('timer');
    const winModal = document.getElementById('win-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const finalMovesSpan = document.getElementById('final-moves');
    const finalTimeSpan = document.getElementById('final-time');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardList = document.getElementById('leaderboard-list');
    const closeLeaderboardModalBtn = document.getElementById('close-leaderboard-modal-btn');
    const backToLobbyBtn = document.getElementById('back-to-lobby-btn');

    let tiles = [];
    const gridSize = 4;
    let moves = 0;
    let timerInterval = null;
    let startTime = 0;
    let isAnimating = false;

    // 如果处于离线模式，隐藏排行榜按钮
    if (isOfflineMode) {
        leaderboardBtn.style.display = 'none';
    }

    // 初始化游戏
    function initGame() {
        gameBoard.innerHTML = '';
        tiles = [];
        moves = 0;
        movesCountSpan.textContent = moves;
        clearInterval(timerInterval);
        timerInterval = null;
        timerSpan.textContent = '00:00';
        startTime = 0;
        winModal.style.display = 'none';
        leaderboardModal.style.display = 'none';
        isAnimating = false;

        let solvable = false;
        while (!solvable) {
            const numbers = Array.from({ length: 15 }, (_, i) => i + 1);
            shuffleArray(numbers);
            tiles = [...numbers, 0];

            const inversions = countInversions(tiles);
            const emptyRowFromBottom = 4 - Math.floor(tiles.indexOf(0) / gridSize);

            if ((inversions % 2 === 0 && emptyRowFromBottom % 2 !== 0) ||
                (inversions % 2 !== 0 && emptyRowFromBottom % 2 === 0)) {
                solvable = true;
            }
        }
        createTiles();
    }

    // 初始创建方块
    function createTiles() {
        gameBoard.innerHTML = '';
        // 参考2048做法，使用棋盘容器的 clientWidth，gap 与 style.css 保持一致
        const gridSize = 4;
        const boardWidth = gameBoard.clientWidth;
        const gap = 8; // px
        const tileSize = (boardWidth - gap * (gridSize - 1)) / gridSize;
        tiles.forEach((number, index) => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            if (number === 0) {
                tile.classList.add('empty-tile');
            } else {
                tile.textContent = number;
                tile.dataset.number = number;
                tile.addEventListener('click', handleTileClick);
            }
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;
            tile.style.left = `${col * (tileSize + gap)}px`;
            tile.style.top = `${row * (tileSize + gap)}px`;
            tile.style.lineHeight = `${tileSize}px`;
            tile.style.fontSize = `${Math.max(tileSize * 0.42, 18)}px`;
            tile.style.transition = 'transform 0.25s cubic-bezier(.4,2,.3,1), left 0.25s, top 0.25s';
            tile.style.transform = 'scale(0.8)';
            setTimeout(() => {
                tile.style.transform = 'scale(1)';
            }, 10);
            gameBoard.appendChild(tile);
        });
    }

    // 更新方块的CSS位置
    function updateTilesPosition() {
        const gridSize = 4;
        const boardWidth = gameBoard.clientWidth;
        const gap = 8;
        const tileSize = (boardWidth - gap * (gridSize - 1)) / gridSize;
        const allTiles = gameBoard.querySelectorAll('.tile');
        allTiles.forEach(tileElement => {
            const number = tileElement.dataset.number ? parseInt(tileElement.dataset.number) : 0;
            const newIndex = tiles.indexOf(number);
            const row = Math.floor(newIndex / gridSize);
            const col = newIndex % gridSize;
            tileElement.style.width = `${tileSize}px`;
            tileElement.style.height = `${tileSize}px`;
            tileElement.style.left = `${col * (tileSize + gap)}px`;
            tileElement.style.top = `${row * (tileSize + gap)}px`;
            tileElement.style.lineHeight = `${tileSize}px`;
            tileElement.style.fontSize = `${Math.max(tileSize * 0.42, 18)}px`;
            tileElement.style.transition = 'transform 0.25s cubic-bezier(.4,2,.3,1), left 0.25s, top 0.25s';
            tileElement.style.transform = 'scale(1.08)';
            setTimeout(() => {
                tileElement.style.transform = 'scale(1)';
            }, 180);
        });
    }

    // 处理方块点击事件
    function handleTileClick(event) {
        if (isAnimating) {
            return;
        }

        if (!timerInterval) {
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
        }

        const clickedNumber = parseInt(event.target.dataset.number);
        const tileIndex = tiles.indexOf(clickedNumber);
        
        const emptyIndex = tiles.indexOf(0);
        const canMove = isMovable(tileIndex, emptyIndex);

        if (canMove) {
            isAnimating = true;
            swapTiles(tileIndex, emptyIndex);
            
            updateTilesPosition();
            
            setTimeout(() => {
                isAnimating = false;
                moves++;
                movesCountSpan.textContent = moves;
                
                if (isSolved()) {
                    showWinModal();
                    clearInterval(timerInterval);
                    if (!isOfflineMode) { // 只在在线模式下保存记录
                        saveToLeaderboard();
                    }
                }
            }, 250);
        }
    }

    // 判断方块是否可以移动
    function isMovable(tileIndex, emptyIndex) {
        const tileRow = Math.floor(tileIndex / gridSize);
        const tileCol = tileIndex % gridSize;
        const emptyRow = Math.floor(emptyIndex / gridSize);
        const emptyCol = emptyIndex % gridSize;

        return (tileRow === emptyRow && Math.abs(tileCol - emptyCol) === 1) ||
               (tileCol === emptyCol && Math.abs(tileRow - emptyRow) === 1);
    }

    // 交换方块位置
    function swapTiles(i, j) {
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    // 判断游戏是否完成
    function isSolved() {
        for (let i = 0; i < tiles.length - 1; i++) {
            if (tiles[i] !== i + 1) {
                return false;
            }
        }
        return tiles[15] === 0;
    }

    // 显示胜利弹窗
    function showWinModal() {
        winModal.style.display = 'flex';
        finalMovesSpan.textContent = moves;
        finalTimeSpan.textContent = timerSpan.textContent;
    }

    // 计时器
    function updateTimer() {
        const elapsed = Date.now() - startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const formattedSeconds = String(seconds % 60).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        timerSpan.textContent = `${formattedMinutes}:${formattedSeconds}`;
    }

    // 数组洗牌算法
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 计算逆序数，用于判断谜题可解性
    function countInversions(arr) {
        let inversions = 0;
        const tempArr = arr.filter(n => n !== 0);
        for (let i = 0; i < tempArr.length - 1; i++) {
            for (let j = i + 1; j < tempArr.length; j++) {
                if (tempArr[i] > tempArr[j]) {
                    inversions++;
                }
            }
        }
        return inversions;
    }

    // --- 排行榜功能 ---

    // 将胜利记录保存到 Firestore
    async function saveToLeaderboard() {
        try {
            const timeInSeconds = Math.floor((Date.now() - startTime) / 1000);
            let playerName = prompt("恭喜通关！请输入您的名字：", "玩家");
            if (playerName === null || playerName.trim() === "") {
                playerName = "匿名玩家";
            }
            const now = new Date();
            const dateStr = now.toLocaleString();
            const docRef = await leaderboardCollection.add({
                moves: moves,
                time: timeInSeconds,
                name: playerName.substring(0, 15),
                date: dateStr
            });
            console.log("记录已添加到排行榜，ID: ", docRef.id);
        } catch (e) {
            console.error("添加记录失败: ", e);
        }
    }

    // 从 Firestore 获取并显示排行榜
    async function showLeaderboard() {
        if (isOfflineMode) {
            alert("当前处于离线模式，无法加载排行榜。");
            return;
        }

        leaderboardList.innerHTML = '<li>加载中...</li>';
        leaderboardModal.style.display = 'flex';

        try {
            // 只按 time 升序排序
            const q = leaderboardCollection.orderBy("time").limit(20);
            const querySnapshot = await q.get();

            leaderboardList.innerHTML = '';
            let rank = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const minutes = Math.floor(data.time / 60);
                const seconds = data.time % 60;
                const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank-number">${rank}.</span>
                    <span class="rank-data">玩家: ${data.name || "匿名"} 步数: ${data.moves}, 用时: ${formattedTime}, 时间: ${data.date || ""}</span>
                `;
                leaderboardList.appendChild(li);
                rank++;
            });
        } catch (e) {
            console.error("获取排行榜失败: ", e);
            leaderboardList.innerHTML = `<li>加载排行榜失败，请稍后重试。<br>错误：${e.message}</li>`;
        }
    }

    // 事件监听
    newGameBtn.addEventListener('click', initGame);
    closeModalBtn.addEventListener('click', initGame);
    leaderboardBtn.addEventListener('click', showLeaderboard);
    closeLeaderboardModalBtn.addEventListener('click', () => {
        leaderboardModal.style.display = 'none';
    });
    backToLobbyBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });

    initGame();
});

window.addEventListener('resize', () => {
    updateTilesPosition();
});