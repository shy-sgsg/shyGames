import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, getDocs } from "firebase/firestore";

// Firebase 配置信息 (请替换成你自己的)
const firebaseConfig = {
    apiKey: "AIzaSyCIRI2D9937f3iwtCJXU6zabDMYT0R18dU",
    authDomain: "game-2048-935e4.firebaseapp.com",
    projectId: "game-2048-935e4",
    storageBucket: "game-2048-935e4.appspot.com", // 修正拼写错误
    messagingSenderId: "561986111957",
    appId: "1:561986111957:web:129c25516ad68c2920d55c"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const leaderboardCollection = collection(db, "leaderboard");

document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const solveBtn = document.getElementById('solve-btn');
    const movesCountSpan = document.getElementById('moves-count');
    const timerSpan = document.getElementById('timer');
    const winModal = document.getElementById('win-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const finalMovesSpan = document.getElementById('final-moves');
    const finalTimeSpan = document.getElementById('final-time');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardList = document.getElementById('leaderboard-list');
    const closeLeaderboardModalBtn = document.getElementById('close-leaderboard-modal-btn');

    let tiles = [];
    const gridSize = 4;
    let moves = 0;
    let timerInterval = null;
    let startTime = 0;
    let isAnimating = false;

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
        tiles.forEach(number => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            if (number === 0) {
                tile.classList.add('empty-tile');
            } else {
                tile.textContent = number;
                tile.dataset.number = number;
                tile.addEventListener('click', handleTileClick);
            }

            const index = tiles.indexOf(number);
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            tile.style.transform = `translate(${col * 110}px, ${row * 110}px)`;

            gameBoard.appendChild(tile);
        });
    }

    // 更新方块的CSS位置
    function updateTilesPosition() {
        const allTiles = gameBoard.querySelectorAll('.tile');
        
        allTiles.forEach(tileElement => {
            const number = tileElement.dataset.number ? parseInt(tileElement.dataset.number) : 0;
            const newIndex = tiles.indexOf(number);

            const row = Math.floor(newIndex / gridSize);
            const col = newIndex % gridSize;
            tileElement.style.transform = `translate(${col * 110}px, ${row * 110}px)`;
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
                    saveToLeaderboard();
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
            const docRef = await addDoc(leaderboardCollection, {
                moves: moves,
                time: timeInSeconds,
                date: new Date()
            });
            console.log("记录已添加到排行榜，ID: ", docRef.id);
        } catch (e) {
            console.error("添加记录失败: ", e);
        }
    }

    // 从 Firestore 获取并显示排行榜
    async function showLeaderboard() {
        leaderboardList.innerHTML = '<li>加载中...</li>';
        leaderboardModal.style.display = 'flex';
        
        try {
            // 查询 Firestore，先按步数升序排列，步数相同时按时间升序排列
            const q = query(leaderboardCollection, orderBy("moves"), orderBy("time"));
            const querySnapshot = await getDocs(q);
            
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
                    <span class="rank-data">步数: ${data.moves}, 用时: ${formattedTime}</span>
                `;
                leaderboardList.appendChild(li);
                rank++;
            });
        } catch (e) {
            console.error("获取排行榜失败: ", e);
            leaderboardList.innerHTML = '<li>加载排行榜失败，请稍后重试。</li>';
        }
    }

    // 事件监听
    newGameBtn.addEventListener('click', initGame);
    closeModalBtn.addEventListener('click', initGame);
    leaderboardBtn.addEventListener('click', showLeaderboard);
    closeLeaderboardModalBtn.addEventListener('click', () => {
        leaderboardModal.style.display = 'none';
    });

    // 自动求解功能 (简化版)
    solveBtn.addEventListener('click', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        const manhattanDistance = (state) => {
            let distance = 0;
            for (let i = 0; i < state.length; i++) {
                if (state[i] !== 0) {
                    const targetIndex = state[i] - 1;
                    const currentRow = Math.floor(i / gridSize);
                    const currentCol = i % gridSize;
                    const targetRow = Math.floor(targetIndex / gridSize);
                    const targetCol = targetIndex % gridSize;
                    distance += Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
                }
            }
            return distance;
        };
        const runSolver = () => {
            if (isSolved() || isAnimating) {
                return;
            }
            const currentState = [...tiles];
            const emptyIndex = currentState.indexOf(0);
            const directions = [-1, 1, -gridSize, gridSize];
            let nextMove = -1;
            let bestHeuristic = Infinity;
            for(let i = 0; i < directions.length; i++) {
                const tileIndex = emptyIndex + directions[i];
                if (tileIndex >= 0 && tileIndex < 16) {
                    const tempTiles = [...currentState];
                    [tempTiles[tileIndex], tempTiles[emptyIndex]] = [tempTiles[emptyIndex], tempTiles[tileIndex]];
                    const heuristic = manhattanDistance(tempTiles);
                    if (heuristic < bestHeuristic) {
                        bestHeuristic = heuristic;
                        nextMove = tileIndex;
                    }
                }
            }
            if (nextMove !== -1) {
                const numberToMove = tiles[nextMove];
                const tileToMove = gameBoard.querySelector(`[data-number="${numberToMove}"]`);
                if (tileToMove) {
                     tileToMove.click(); 
                }
                if (!isSolved()) {
                    setTimeout(runSolver, 200);
                }
            } else {
                console.log("自动求解完成或无法找到最优解");
            }
        };
        alert('自动求解功能正在启动，请勿操作！');
        runSolver();
    });

    initGame();
});