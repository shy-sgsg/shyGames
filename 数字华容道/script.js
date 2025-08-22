document.addEventListener('DOMContentLoaded', () => {
    // Firebase 配置
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

    // 获取DOM元素
    const gameScreen = document.getElementById('game-screen');
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    const board = document.getElementById('puzzle-board');
    const movesCount = document.getElementById('moves-count');
    const timerDisplay = document.getElementById('timer');
    const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
    const leaderboardLoading = document.getElementById('leaderboard-loading');
    
    // 按钮
    const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
    const backToLobbyBtn = document.getElementById('back-to-lobby-btn');
    const backFromLeaderboardBtn = document.getElementById('back-from-leaderboard-btn');
    const newGameBtn = document.getElementById('new-game-btn');

    // 弹窗元素
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const playerNameInput = document.getElementById('player-name-input');
    const submitNameBtn = document.getElementById('submit-name-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // 游戏状态变量
    let tiles = [];
    let moveCounter = 0;
    let timer;
    let startTime;
    let isGameRunning = false;
    let isTimerRunning = false;
    let finalTime = 0;

    // 屏幕切换函数
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // 游戏初始化函数
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
        finalTime = 0;
        playerNameInput.value = '';
    }

    // 随机打乱数组（Fisher-Yates洗牌算法）
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 判断谜题是否可解
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

    // 处理方块点击事件
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

    // 检查方块是否可移动（与空白方块相邻）
    function canMove(clickedIndex, emptyIndex) {
        const clickedRow = Math.floor(clickedIndex / 4);
        const clickedCol = clickedIndex % 4;
        const emptyRow = Math.floor(emptyIndex / 4);
        const emptyCol = emptyIndex % 4;
        return (clickedRow === emptyRow && Math.abs(clickedCol - emptyCol) === 1) || 
               (clickedCol === emptyCol && Math.abs(clickedRow - emptyRow) === 1);
    }

    // 交换DOM元素和数组中的值
    function swapTiles(index1, index2) {
        [tiles[index1], tiles[index2]] = [tiles[index2], tiles[index1]];
        const tile1 = board.children[index1];
        const tile2 = board.children[index2];
        const tile1Clone = tile1.cloneNode(true);
        const tile2Clone = tile2.cloneNode(true);
        board.replaceChild(tile2Clone, tile1);
        board.replaceChild(tile1Clone, tile2);
    }
    
    // 检查是否胜利
    function checkWin() {
        for (let i = 0; i < tiles.length - 1; i++) {
            if (tiles[i] !== i + 1) {
                return false;
            }
        }
        return tiles[15] === 0;
    }

    // 游戏结束函数
    function endGame() {
        isGameRunning = false;
        clearInterval(timer);
        finalTime = (performance.now() - startTime) / 1000;
        
        const formattedTime = formatTime(finalTime);
        modalMessage.textContent = `恭喜你，你用 ${movesCount.textContent} 步，在 ${formattedTime} 内完成了游戏！`;
        
        modal.style.display = 'flex';
        playerNameInput.focus();
    }

    // 计时器函数
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
    
    // 格式化时间函数
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
        const milliseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000).toString().padStart(3, '0');
        return `${minutes}:${seconds}.${milliseconds}`;
    }

    // 获取并显示排行榜数据
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

    // --- 事件监听器 ---

    // 将提交逻辑封装为具名函数，以便进行添加和移除操作
    async function submitNameHandler() {
        const playerName = playerNameInput.value.trim();
        if (playerName !== "") {
            submitNameBtn.disabled = true; // 提交时禁用按钮
            try {
                const newRecord = {
                    name: playerName,
                    moves: moveCounter,
                    time: finalTime,
                    date: new Date().toISOString()
                };
                await leaderboardCollection.add(newRecord);
                alert("记录已保存到排行榜!");
            } catch (error) {
                console.error("保存记录失败: ", error);
                alert("保存记录失败，请稍后重试。");
            } finally {
                submitNameBtn.disabled = false; // 无论成功或失败，都重新启用按钮
                modal.style.display = 'none'; // 隐藏弹窗
            }
        }
    }

    // 使用具名函数绑定，防止事件重复绑定
    submitNameBtn.addEventListener('click', submitNameHandler);
    playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submitNameBtn.click();
        }
    });

    // 其他事件监听器
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
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 页面加载时自动开始游戏
    initGame();
});