document.addEventListener('DOMContentLoaded', () => {
    // 1. Firebase 配置和初始化
    // 请替换成您的 Firebase 项目配置信息
    const firebaseConfig = {
        apiKey: "AIzaSyCIRI2D9937f3iwtCJXU6zabDMYT0R18dU",
        authDomain: "game-2048-935e4.firebaseapp.com",
        projectId: "game-2048-935e4",
        storageBucket: "game-2048-935e4.appspot.com",
        messagingSenderId: "561986111957",
        appId: "1:561986111957:web:129c25516ad68c2920d55c"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    const leaderboardCollection = db.collection('leaderboard');

    // 2. DOM 元素获取
    const boardElement = document.getElementById('board');
    const minesCountElement = document.getElementById('mines-count');
    const timerElement = document.getElementById('timer');
    const statusMessageElement = document.getElementById('game-status');
    const newGameBtn = document.getElementById('new-game-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const returnLobbyBtn = document.getElementById('return-lobby-btn');
    const leaderboardContainer = document.getElementById('leaderboard-container');
    const leaderboardList = document.getElementById('leaderboard-list');
    const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
    // 新增：弹窗相关元素
    const modalOverlay = document.getElementById('modal-overlay');
    const playerNameInput = document.getElementById('player-name-input');
    const submitNameBtn = document.getElementById('submit-name-btn');
    const cancelNameBtn = document.getElementById('cancel-name-btn');


    // 3. 游戏状态变量
    const rows = 10;
    const cols = 10;
    const totalMines = 10;
    let board = [];
    let revealedCells = 0;
    let isGameOver = false;
    let timerInterval;
    let startTime;
    let isFirstClick = true;
    let isSubmitting = false; // 新增：防重复提交标志

    // 4. 核心游戏函数
    function initGame() {
        boardElement.innerHTML = '';
        board = [];
        revealedCells = 0;
        isGameOver = false;
        isFirstClick = true;
        statusMessageElement.textContent = '';
        statusMessageElement.classList.remove('win', 'lose');
        minesCountElement.textContent = `雷数: ${totalMines}`;
        clearInterval(timerInterval);
        timerElement.textContent = `时间: 0.000`;

        boardElement.style.gridTemplateColumns = `repeat(${cols}, 30px)`;

        for (let i = 0; i < rows; i++) {
            board[i] = [];
            for (let j = 0; j < cols; j++) {
                const cellElement = document.createElement('div');
                cellElement.classList.add('cell');
                cellElement.dataset.row = i;
                cellElement.dataset.col = j;
                boardElement.appendChild(cellElement);

                board[i][j] = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    mineCount: 0,
                    element: cellElement
                };
            }
        }
    }

    function setupGame(startRow, startCol) {
        placeMines(startRow, startCol);
        calculateMineCounts();
        startTimer();
    }

    function placeMines(startRow, startCol) {
        let minesPlaced = 0;
        while (minesPlaced < totalMines) {
            const row = Math.floor(Math.random() * rows);
            const col = Math.floor(Math.random() * cols);
            if (!board[row][col].isMine && (Math.abs(row - startRow) > 1 || Math.abs(col - startCol) > 1)) {
                board[row][col].isMine = true;
                minesPlaced++;
            }
        }
    }

    function calculateMineCounts() {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (board[i][j].isMine) continue;
                let count = 0;
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const newRow = i + dx;
                        const newCol = j + dy;
                        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
                            if (board[newRow][newCol].isMine) {
                                count++;
                            }
                        }
                    }
                }
                board[i][j].mineCount = count;
            }
        }
    }

    function handleCellClick(event) {
        if (isGameOver) return;
        const cellElement = event.target;
        if (!cellElement.classList.contains('cell')) return;
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        if (isFirstClick) {
            setupGame(row, col);
            isFirstClick = false;
            revealCell(row, col);
            checkWin();
            return;
        }
        const cellData = board[row][col];
        if (cellData.isRevealed || cellData.isFlagged) {
            return;
        }
        if (cellData.isMine) {
            endGame(false);
        } else {
            revealCell(row, col);
            checkWin();
        }
    }

    function handleCellRightClick(event) {
        event.preventDefault();
        if (isGameOver || isFirstClick) return;
        const cellElement = event.target;
        if (!cellElement.classList.contains('cell')) return;
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        const cellData = board[row][col];
        if (!cellData.isRevealed) {
            cellData.isFlagged = !cellData.isFlagged;
            cellElement.classList.toggle('flagged');
            if (cellData.isFlagged) {
                cellElement.textContent = '🚩';
            } else {
                cellElement.textContent = '';
            }
            updateMinesCount();
        }
    }

    function revealCell(row, col) {
        if (row < 0 || row >= rows || col < 0 || col >= cols || board[row][col].isRevealed || board[row][col].isFlagged) {
            return;
        }
        const cellData = board[row][col];
        cellData.isRevealed = true;
        revealedCells++;
        cellData.element.classList.add('revealed');
        if (cellData.mineCount > 0) {
            cellData.element.textContent = cellData.mineCount;
            cellData.element.style.color = getNumberColor(cellData.mineCount);
        } else {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    revealCell(row + dx, col + dy);
                }
            }
        }
    }

    function getNumberColor(count) {
        const colors = ['', '#0000FF', '#008200', '#FF0000', '#000084', '#840000', '#008284', '#840084', '#787878'];
        return colors[count];
    }
    
    // 5. 修改 endGame 函数以使用自定义弹窗
    function endGame(isWin) {
        isGameOver = true;
        clearInterval(timerInterval);

        if (isWin) {
            statusMessageElement.textContent = '恭喜你，胜利了！';
            statusMessageElement.classList.add('win');
            showNameModal(); // 显示自定义弹窗
        } else {
            statusMessageElement.textContent = '游戏结束，你踩到雷了！';
            statusMessageElement.classList.add('lose');
            revealAllMines();
        }
    }

    function revealAllMines() {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (board[i][j].isMine) {
                    board[i][j].element.classList.add('mine');
                    board[i][j].element.textContent = '💣';
                }
            }
        }
    }

    function checkWin() {
        if (revealedCells === rows * cols - totalMines) {
            endGame(true);
        }
    }

    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const formattedTime = (elapsedTime / 1000).toFixed(3);
            timerElement.textContent = `时间: ${formattedTime}`;
        }, 10);
    }

    function updateMinesCount() {
        const flaggedCount = board.flat().filter(cell => cell.isFlagged).length;
        minesCountElement.textContent = `雷数: ${totalMines - flaggedCount}`;
    }

    // 6. 排行榜功能
    async function showLeaderboard() {
        try {
            const snapshot = await leaderboardCollection.orderBy('time', 'asc').limit(10).get();
            leaderboardList.innerHTML = '';
            let rank = 1;
            snapshot.forEach(doc => {
                const data = doc.data();
                const li = document.createElement('li');
                li.innerHTML = `<span>${rank}. ${data.name}</span><span>${data.time.toFixed(3)} s</span>`;
                leaderboardList.appendChild(li);
                rank++;
            });
            leaderboardContainer.classList.remove('hidden');
        } catch (error) {
            console.error("获取排行榜失败: ", error);
            alert("获取排行榜失败，请稍后再试。");
        }
    }
    
    // 7. 新增：自定义弹窗函数
    function showNameModal() {
        modalOverlay.classList.remove('hidden');
        playerNameInput.focus();
        // 阻止背景滚动
        document.body.style.overflow = 'hidden';
    }

    function hideNameModal() {
        modalOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
        playerNameInput.value = ''; // 清空输入框
    }

    async function submitScore() {
        if (isSubmitting) { // 检查是否正在提交
            console.log("正在提交，请勿重复操作。");
            return;
        }

        const playerName = playerNameInput.value.trim();
        if (!playerName) {
            alert("请输入你的名字！");
            return;
        }

        isSubmitting = true; // 设置标志为 true，表示提交开始
        submitNameBtn.disabled = true; // 禁用提交按钮

        const finalTime = parseFloat(timerElement.textContent.replace('时间: ', ''));
        try {
            await leaderboardCollection.add({
                name: playerName,
                time: finalTime,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("你的成绩已记录到排行榜！");
            hideNameModal();
        } catch (error) {
            console.error("上传成绩失败: ", error);
            alert("上传成绩失败，请检查网络或控制台。");
        } finally {
            isSubmitting = false; // 无论成功或失败，都重置标志
            submitNameBtn.disabled = false; // 重新启用提交按钮
        }
    }
    
    // 8. 事件监听器
    newGameBtn.addEventListener('click', () => {
        initGame();
        leaderboardContainer.classList.add('hidden');
    });

    leaderboardBtn.addEventListener('click', () => {
        showLeaderboard();
    });

    closeLeaderboardBtn.addEventListener('click', () => {
        leaderboardContainer.classList.add('hidden');
    });

    boardElement.addEventListener('click', handleCellClick);
    boardElement.addEventListener('contextmenu', handleCellRightClick);

    returnLobbyBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    
    // 新增：弹窗按钮事件
    submitNameBtn.addEventListener('click', submitScore);
    cancelNameBtn.addEventListener('click', hideNameModal);

    // 允许按 Enter 键提交
    playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submitScore();
        }
    });

    initGame();
});