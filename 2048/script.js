document.addEventListener('DOMContentLoaded', () => {
    // *** 请将下方这部分代码替换为您自己的 Firebase 配置 ***
    const firebaseConfig = {
        apiKey: "AIzaSyCIRI2D9937f3iwtCJXU6zabDMYT0R18dU",
        authDomain: "game-2048-935e4.firebaseapp.com",
        projectId: "game-2048-935e4",
        storageBucket: "game-2048-935e4.appspot.com",
        messagingSenderId: "561986111957",
        appId: "1:561986111957:web:129c25516ad68c2920d55c",
        measurementId: "G-P0M1P2GZQF"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const gameArea = document.getElementById('game-area');
    const gridContainer = document.getElementById('grid-container');
    const tileContainer = document.getElementById('tile-container');
    const scoreElement = document.getElementById('score');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const newGameButton = document.getElementById('new-game-button');
    const tryAgainButton = document.getElementById('try-again-button');
    const leaderboardList = document.getElementById('leaderboard-list');
    const noScoresMessage = document.getElementById('no-scores-message');
    const toggleLeaderboardButton = document.getElementById('toggle-leaderboard-button');
    const leaderboardContainer = document.getElementById('leaderboard-container');
    const nameModal = document.getElementById('name-modal');
    const nameInput = document.getElementById('player-name-input');
    const saveNameButton = document.getElementById('save-name-button');
    const modalScoreElement = document.getElementById('modal-score');

    // 修复移动端点击游戏结束按钮无效的问题
    gameOverOverlay.addEventListener('touchstart', e => {
        e.stopPropagation();
    }, { passive: false });

    gameOverOverlay.addEventListener('touchend', e => {
        e.stopPropagation();
    }, { passive: false });

    const GRID_SIZE = 4;
    let grid = [];
    let score = 0;
    let isAnimating = false;
    let cellPositions = [];
    let leaderboard = [];

    function cacheCellPositions() {
        cellPositions = [];
        const gridCells = gridContainer.querySelectorAll('.grid-cell');
        let index = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
            const rowPositions = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = gridCells[index++];
                rowPositions.push({
                    top: cell.offsetTop,
                    left: cell.offsetLeft,
                    width: cell.offsetWidth,
                    height: cell.offsetHeight
                });
            }
            cellPositions.push(rowPositions);
        }
    }

    function init() {
        setupGrid();
        loadLeaderboard();
        newGame();
        updateScore(0);
    }

    function setupGrid() {
        gridContainer.innerHTML = '';
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            gridContainer.appendChild(cell);
        }
        cacheCellPositions();
    }

    function newGame() {
        grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
        updateScore(0);
        gameOverOverlay.classList.add('hidden');
        gameOverOverlay.classList.remove('flex');
        tileContainer.innerHTML = '';
        cacheCellPositions();
        addRandomTile();
        addRandomTile();
        loadLeaderboard();
        nameModal.classList.add('hidden');
    }

    function updateScore(newScore) {
        score = newScore;
        scoreElement.textContent = score;
    }

    function addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === 0) emptyCells.push({ r, c });
            }
        }
        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            grid[r][c] = value;
            createTile(r, c, value, true);
        }
    }

    function createTile(row, col, value, isNew = false) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        if (isNew) tile.classList.add('tile-new');

        tile.dataset.value = value;
        tile.textContent = value;

        if (cellPositions[row] && cellPositions[row][col]) {
            const pos = cellPositions[row][col];
            tile.style.width = `${pos.width}px`;
            tile.style.height = `${pos.height}px`;
            tile.style.top = `${pos.top}px`;
            tile.style.left = `${pos.left}px`;

            tile.style.fontSize = `${pos.width * 0.4}px`;
            if (value > 999) tile.style.fontSize = `${pos.width * 0.3}px`;
        } else {
            console.error("无法找到单元格位置缓存: ", { row, col });
            return;
        }

        tileContainer.appendChild(tile);
    }

    async function handleMove(direction) {
        if (isAnimating) return;
        isAnimating = true;

        const { newGrid, scoreIncrease, moves } = processMove(direction);

        if (JSON.stringify(grid) !== JSON.stringify(newGrid)) {
            grid = newGrid;
            updateScore(score + scoreIncrease);
            await animateMoves(moves);
            addRandomTile();
            if (isGameOver()) {
                endGame();
            }
        }

        setTimeout(() => { isAnimating = false; }, 150);
    }

    function processMove(direction) {
        let scoreIncrease = 0;
        let newGrid = JSON.parse(JSON.stringify(grid));
        let moves = [];
        const isVertical = direction === 'up' || direction === 'down';
        const isReverse = direction === 'right' || direction === 'down';
        for (let i = 0; i < GRID_SIZE; i++) {
            let line = [];
            for (let j = 0; j < GRID_SIZE; j++) { line.push(isVertical ? newGrid[j][i] : newGrid[i][j]); }
            const { newLine, lineScore, lineMoves } = processLine(line, isReverse);
            scoreIncrease += lineScore;
            for (let j = 0; j < GRID_SIZE; j++) {
                if (isVertical) { newGrid[j][i] = newLine[j]; } else { newGrid[i][j] = newLine[j]; }
            }
            lineMoves.forEach(move => {
                moves.push({
                    from: isVertical ? { r: move.from, c: i } : { r: i, c: move.from },
                    to: isVertical ? { r: move.to, c: i } : { r: i, c: move.to },
                    value: move.value, isMerge: move.isMerge
                });
            });
        }
        return { newGrid, scoreIncrease, moves };
    }

    function processLine(line, isReverse) {
        if (isReverse) line.reverse();
        let filteredLine = line.filter(v => v !== 0);
        let newLine = []; let lineScore = 0; let lineMoves = [];
        let originalIndices = [];
        line.forEach((val, index) => { if (val !== 0) originalIndices.push(index); });
        for (let i = 0; i < filteredLine.length; i++) {
            if (i + 1 < filteredLine.length && filteredLine[i] === filteredLine[i + 1]) {
                const mergedValue = filteredLine[i] * 2;
                newLine.push(mergedValue);
                lineScore += mergedValue;
                const toIndex = newLine.length - 1;
                lineMoves.push({ from: originalIndices[i], to: toIndex, value: filteredLine[i], isMerge: false });
                lineMoves.push({ from: originalIndices[i + 1], to: toIndex, value: filteredLine[i + 1], isMerge: true });
                i++;
            } else {
                newLine.push(filteredLine[i]);
                const toIndex = newLine.length - 1;
                lineMoves.push({ from: originalIndices[i], to: toIndex, value: filteredLine[i], isMerge: false });
            }
        }
        while (newLine.length < GRID_SIZE) { newLine.push(0); }
        if (isReverse) {
            newLine.reverse();
            lineMoves.forEach(move => {
                move.from = GRID_SIZE - 1 - move.from;
                move.to = GRID_SIZE - 1 - move.to;
            });
        }
        return { newLine, lineScore, lineMoves };
    }

    function animateMoves(moves) {
        return new Promise(resolve => {
            const movingTiles = [];
            moves.forEach(move => {
                const tile = findTile(move.from.r, move.from.c);
                if (tile) {
                    const pos = cellPositions[move.to.r][move.to.c];
                    tile.style.top = `${pos.top}px`;
                    tile.style.left = `${pos.left}px`;
                    tile.dataset.isMoving = true;
                    movingTiles.push({ tile, move });
                }
            });

            setTimeout(() => {
                movingTiles.forEach(({ tile, move }) => {
                    if (move.isMerge) tile.remove();
                    else delete tile.dataset.isMoving;
                });
                const mergedTiles = moves.filter(m => m.isMerge);
                mergedTiles.forEach(move => {
                    const targetTile = findTile(move.to.r, move.to.c, true);
                    if (targetTile) {
                        const newValue = move.value * 2;
                        targetTile.dataset.value = newValue;
                        targetTile.textContent = newValue;
                        targetTile.classList.add('tile-merged');
                        const pos = cellPositions[move.to.r][move.to.c];
                        targetTile.style.fontSize = `${pos.width * 0.4}px`;
                        if (newValue > 999) targetTile.style.fontSize = `${pos.width * 0.3}px`;
                        targetTile.addEventListener('animationend', () => targetTile.classList.remove('tile-merged'), { once: true });
                    }
                });
                resolve();
            }, 150);
        });
    }

    function findTile(r, c, ignoreMoving = false) {
        if (!cellPositions[r] || !cellPositions[r][c]) return null;
        const { top, left } = cellPositions[r][c];
        for (const tile of tileContainer.children) {
            if (Math.abs(parseFloat(tile.style.top) - top) < 1 && Math.abs(parseFloat(tile.style.left) - left) < 1) {
                if (ignoreMoving || !tile.dataset.isMoving) return tile;
            }
        }
        return null;
    }

    function isGameOver() {
        for (let r = 0; r < GRID_SIZE; r++) { for (let c = 0; c < GRID_SIZE; c++) { if (grid[r][c] === 0) return false; } }
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (c < GRID_SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
                if (r < GRID_SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
            }
        }
        return true;
    }

    document.addEventListener('keydown', e => {
        switch (e.key) {
            case 'ArrowUp': e.preventDefault(); handleMove('up'); break;
            case 'ArrowDown': e.preventDefault(); handleMove('down'); break;
            case 'ArrowLeft': e.preventDefault(); handleMove('left'); break;
            case 'ArrowRight': e.preventDefault(); handleMove('right'); break;
        }
    });

    let touchStartX = 0; let touchStartY = 0; let touchEndX = 0; let touchEndY = 0;

    gameArea.addEventListener('touchstart', e => {
        e.preventDefault();
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: false });

    gameArea.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });

    gameArea.addEventListener('touchend', e => {
        e.preventDefault();
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    });

    function handleSwipe() {
        const dx = touchEndX - touchStartX; const dy = touchEndY - touchStartY;
        const absDx = Math.abs(dx); const absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) > 30) {
            handleMove(absDx > absDy ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }
    }

    newGameButton.addEventListener('click', newGame);
    tryAgainButton.addEventListener('click', newGame);

    toggleLeaderboardButton.addEventListener('click', () => {
        leaderboardContainer.classList.toggle('hidden');
        if (leaderboardContainer.classList.contains('hidden')) {
            toggleLeaderboardButton.textContent = '查看排行榜';
        } else {
            toggleLeaderboardButton.textContent = '隐藏排行榜';
        }
    });

    window.addEventListener('resize', () => {
        cacheCellPositions();
        tileContainer.innerHTML = '';
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] !== 0) createTile(r, c, grid[r][c]);
            }
        }
    });

    // --- 排行榜功能开始 ---

    function loadLeaderboard() {
        db.collection("scores").orderBy("score", "desc").limit(10).get({ source: "server" })
            .then(snapshot => {
                leaderboard = snapshot.docs.map(doc => doc.data());
                renderLeaderboard();
            })
            .catch(error => {
                console.error("加载排行榜失败: ", error);
                leaderboard = [];
                renderLeaderboard();
            });
    }

    function renderLeaderboard() {
        leaderboardList.innerHTML = '';
        if (leaderboard.length === 0) {
            noScoresMessage.classList.remove('hidden');
        } else {
            noScoresMessage.classList.add('hidden');
            leaderboard.forEach((record, index) => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center py-2 px-4 bg-gray-100 rounded-md';
                li.innerHTML = `
                    <span class="font-bold text-lg">${index + 1}.</span>
                    <span class="flex-1 ml-4 truncate">${record.name}</span>
                    <span class="font-semibold text-lg">${record.score}</span>
                    <span class="ml-4 text-sm text-gray-500 hidden sm:inline">${record.date}</span>
                `;
                leaderboardList.appendChild(li);
            });
        }
    }

    // 更新后的 checkAndSaveScore 函数，使用自定义模态框
    function checkAndSaveScore() {
        if (score > 0 && (leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score)) {
            modalScoreElement.textContent = score;
            nameModal.classList.remove('hidden');
            nameInput.focus();
        }
    }

    // 新增的保存名称函数
    function saveScore() {
        let playerName = nameInput.value.trim();
        if (playerName === "") {
            playerName = "匿名玩家";
        }

        const newRecord = {
            score: score,
            name: playerName.substring(0, 15),
            date: new Date().toLocaleString()
        };

        db.collection("scores").add(newRecord)
            .then(() => {
                console.log("成绩上传成功!");
                nameModal.classList.add('hidden');
                loadLeaderboard();
            })
            .catch(error => {
                console.error("上传成绩失败: ", error);
            });
    }

    // 监听保存按钮点击和回车键
    saveNameButton.addEventListener('click', saveScore);
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveScore();
        }
    });

    function endGame() {
        gameOverOverlay.classList.remove('hidden');
        gameOverOverlay.classList.add('flex');
        checkAndSaveScore();
    }

    // --- 排行榜功能结束 ---

    init();
});