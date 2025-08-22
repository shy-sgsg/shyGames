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

    const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
    const backToLobbyBtn = document.getElementById('back-to-lobby-btn');
    const backFromLeaderboardBtn = document.getElementById('back-from-leaderboard-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    
    const board = document.getElementById('puzzle-board');
    const movesCount = document.getElementById('moves-count');
    const timerDisplay = document.getElementById('timer');
    const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
    const leaderboardLoading = document.getElementById('leaderboard-loading');

    // 游戏状态变量
    let tiles = [];
    let moveCounter = 0;
    let timer;
    let seconds = 0;
    let isGameRunning = false;

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
        seconds = 0;
        movesCount.textContent = 0;
        timerDisplay.textContent = '00:00';
        isGameRunning = true;
        clearInterval(timer);
        startTimer();
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

    // 游戏结束
    async function endGame() {
        isGameRunning = false;
        clearInterval(timer);
        
        const playerName = prompt(`恭喜你，你用 ${movesCount.textContent} 步，在 ${timerDisplay.textContent} 内完成了游戏！\n请输入你的姓名，以记录到排行榜:`);
        
        if (playerName && playerName.trim() !== "") {
            const newRecord = {
                name: playerName.trim(),
                moves: moveCounter,
                time: seconds,
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
        // 游戏结束后，停留在游戏界面
        // 用户可自行选择返回大厅
    }

    // 计时器函数
    function startTimer() {
        timer = setInterval(() => {
            seconds++;
            const min = Math.floor(seconds / 60).toString().padStart(2, '0');
            const sec = (seconds % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${min}:${sec}`;
        }, 1000);
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
                const row = `
                    <tr>
                        <td>${rank++}</td>
                        <td>${data.name}</td>
                        <td>${Math.floor(data.time / 60).toString().padStart(2, '0')}:${(data.time % 60).toString().padStart(2, '0')}</td>
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

    // 事件监听器
    showLeaderboardBtn.addEventListener('click', () => {
        showScreen('leaderboard-screen');
        fetchLeaderboard();
    });

    backToLobbyBtn.addEventListener('click', () => {
        isGameRunning = false;
        clearInterval(timer);
        window.location.href = '../index.html'; // 返回大厅的链接
    });
    
    backFromLeaderboardBtn.addEventListener('click', () => {
        showScreen('game-screen');
    });

    newGameBtn.addEventListener('click', initGame);

    board.addEventListener('click', handleTileClick);

    // 页面加载时自动开始游戏
    initGame();
});