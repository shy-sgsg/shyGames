document.addEventListener('DOMContentLoaded', () => {
    // Firebase 配置 (不变)
    const firebaseConfig = {
        apiKey: "AIzaSyCIRI2D9937f3iwtCJXU6zabDMYT0R18dU",
        authDomain: "game-2048-935e4.firebaseapp.com",
        projectId: "game-2048-935e4",
        storageBucket: "game-2048-935e4.appspot.com",
        messagingSenderId: "561986111957",
        appId: "1:561986111957:web:129c25516ad68c2920d55c"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const leaderboardCollection = db.collection("fifteen_puzzle_leaderboard");

    // 获取DOM元素 (新增)
    const gameScreen = document.getElementById('game-screen');
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    const board = document.getElementById('puzzle-board');
    const movesCount = document.getElementById('moves-count');
    const timerDisplay = document.getElementById('timer');
    const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
    const leaderboardLoading = document.getElementById('leaderboard-loading');
    
    // 按钮 (不变)
    const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
    const backToLobbyBtn = document.getElementById('back-to-lobby-btn');
    const backFromLeaderboardBtn = document.getElementById('back-from-leaderboard-btn');
    const newGameBtn = document.getElementById('new-game-btn');

    // 弹窗元素 (新增)
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const playerNameInput = document.getElementById('player-name-input');
    const submitNameBtn = document.getElementById('submit-name-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // 游戏状态变量 (不变)
    let tiles = [];
    let moveCounter = 0;
    let timer;
    let startTime; 
    let isGameRunning = false;
    let isTimerRunning = false; 
    let finalTime = 0; // 存储最终用时

    // 屏幕切换函数 (不变)
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // 游戏初始化函数 (不变)
    function initGame() {
        board.innerHTML = '';
        tiles = [];
        let numbers = Array.from({ length: 16 }, (_, i) => i);
        do {
            shuffle(numbers);
        } while (!isSolvable(numbers));
        numbers.forEach(num => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            if (num === 0) {
                tile.classList.add('empty');
            } else {
                tile.textContent = num;
            }
            board.appendChild(tile);
            tiles.push(num);
        });
        moveCounter = 0;
        movesCount.textContent = 0;
        timerDisplay.textContent = '00:00.000';
        isGameRunning = true;
        isTimerRunning = false;
        clearInterval(timer);
        finalTime = 0; // 重置最终用时
        playerNameInput.value = ''; // 清空输入框
    }

    // ... (shuffle, isSolvable, canMove, swapTiles, checkWin 函数保持不变) ...
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    function isSolvable(arr) {
        let inversions = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === 0) continue;
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[j] !== 0 && arr[i] > arr[j]) {
                    inversions++;
                }
            }
        }
        const emptyRowFromBottom = 4 - Math.floor(arr.indexOf(0) / 4);
        if (emptyRowFromBottom % 2 === 0) {
            return inversions % 2 !== 0;
        } else {
            return inversions % 2 === 0;
        }
    }
    function handleTileClick(event) {
        if (!isGameRunning) return;
        if (!isTimerRunning) {
            startTimer();
            isTimerRunning = true;
        }
        const clickedTile = event.target;
        if (!clickedTile.classList.contains('tile') || clickedTile.classList.contains('empty')) {
            return;
        }
        const clickedIndex = Array.from(board.children).indexOf(clickedTile);
        const emptyIndex = tiles.indexOf(0);
        if (canMove(clickedIndex, emptyIndex)) {
            swapTiles(clickedIndex, emptyIndex);
            moveCounter++;
            movesCount.textContent = moveCounter;
            if (checkWin()) {
                endGame();
            }
        }
    }
    function canMove(clickedIndex, emptyIndex) {
        const clickedRow = Math.floor(clickedIndex / 4);
        const clickedCol = clickedIndex % 4;
        const emptyRow = Math.floor(emptyIndex / 4);
        const emptyCol = emptyIndex % 4;
        return (clickedRow === emptyRow && Math.abs(clickedCol - emptyCol) === 1) || 
               (clickedCol === emptyCol && Math.abs(clickedRow - emptyRow) === 1);
    }
    function swapTiles(index1, index2) {
        [tiles[index1], tiles[index2]] = [tiles[index2], tiles[index1]];
        const tile1 = board.children[index1];
        const tile2 = board.children[index2];
        const tile1Clone = tile1.cloneNode(true);
        const tile2Clone = tile2.cloneNode(true);
        board.replaceChild(tile2Clone, tile1);
        board.replaceChild(tile1Clone, tile2);
    }
    function checkWin() {
        for (let i = 0; i < tiles.length - 1; i++) {
            if (tiles[i] !== i + 1) {
                return false;
            }
        }
        return tiles[15] === 0;
    }

    // 游戏结束函数 (重大修改)
    function endGame() {
        isGameRunning = false;
        clearInterval(timer);
        finalTime = (performance.now() - startTime) / 1000;
        
        const formattedTime = formatTime(finalTime);
        modalMessage.textContent = `恭喜你，你用 ${movesCount.textContent} 步，在 ${formattedTime} 内完成了游戏！`;
        
        modal.style.display = 'flex'; // 显示自定义弹窗
        playerNameInput.focus();
    }

    // 计时器函数 (不变)
    function startTimer() {
        startTime = performance.now();
        timer = setInterval(() => {
            const elapsedTime = performance.now() - startTime;
            const totalSeconds = Math.floor(elapsedTime / 1000);
            const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
            const seconds = (totalSeconds % 60).toString().padStart(2, '0');
            const milliseconds = Math.floor(elapsedTime % 1000).toString().padStart(3, '0');
            timerDisplay.textContent = `${minutes}:${seconds}.${milliseconds}`;
        }, 10);
    }
    
    // 格式化时间函数 (不变)
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
        const milliseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000).toString().padStart(3, '0');
        return `${minutes}:${seconds}.${milliseconds}`;
    }

    // 获取并显示排行榜数据 (不变)
    async function fetchLeaderboard() {
        leaderboardLoading.style.display = 'block';
        leaderboardTableBody.innerHTML = '';
        try {
            const snapshot = await leaderboardCollection.orderBy("time").limit(10).get();
            let rank = 1;
            snapshot.forEach(doc => {
                const data = doc.data();
                const formattedTime = formatTime(data.time);
                const row = `
                    <tr>
                        <td>${rank++}</td>
                        <td>${data.name}</td>
                        <td>${formattedTime}</td>
                        <td>${data.moves}</td>
                    </tr>
                `;
                leaderboardTableBody.innerHTML += row;
            });
        } catch (error) {
            console.error("获取排行榜失败: ", error);
            leaderboardTableBody.innerHTML = '<tr><td colspan="4">获取排行榜数据失败。</td></tr>';
        }
        leaderboardLoading.style.display = 'none';
    }

    // 事件监听器 (新增弹窗相关)
    showLeaderboardBtn.addEventListener('click', () => {
        showScreen('leaderboard-screen');
        fetchLeaderboard();
    });

    backToLobbyBtn.addEventListener('click', () => {
        isGameRunning = false;
        clearInterval(timer);
        window.location.href = '../index.html';
    });
    
    backFromLeaderboardBtn.addEventListener('click', () => {
        showScreen('game-screen');
    });

    newGameBtn.addEventListener('click', initGame);

    board.addEventListener('click', handleTileClick);
    
    // 处理弹窗提交按钮
    submitNameBtn.addEventListener('click', async () => {
        const playerName = playerNameInput.value.trim();
        if (playerName !== "") {
            const newRecord = {
                name: playerName,
                moves: moveCounter,
                time: finalTime,
                date: new Date().toISOString()
            };
            try {
                await leaderboardCollection.add(newRecord);
                alert("记录已保存到排行榜!");
            } catch (error) {
                console.error("保存记录失败: ", error);
                alert("保存记录失败，请稍后重试。");
            }
        }
        modal.style.display = 'none'; // 隐藏弹窗
    });

    // 处理弹窗关闭按钮
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // 监听键盘事件，以便在弹窗显示时按 Enter 提交
    playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submitNameBtn.click();
        }
    });

    // 页面加载时自动开始游戏
    initGame();
});