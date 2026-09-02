// ============================================================
//  BALL DROP GAME — JavaScript / Canvas port
//  With difficulty selection (Easy: 4, Medium: 5, Hard: 6 balls)
//  Win condition: each column must have all same color
//  Progress tracking with non-blocking sidebar messages
// ============================================================

// -------- Constants & DOM refs --------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const movesDisplay = document.getElementById('movesDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const bestTimeDisplay = document.getElementById('bestTimeDisplay');
const bestTimeEasy = document.getElementById('bestTimeEasy');
const bestTimeMedium = document.getElementById('bestTimeMedium');
const bestTimeHard = document.getElementById('bestTimeHard');
const messageOverlay = document.getElementById('message-overlay');
const winMessage = document.getElementById('winMessage');
const bestTimeMessage = document.getElementById('bestTimeMessage');
const winPlayAgain = document.getElementById('winPlayAgain');
const winClose = document.getElementById('winClose');
const newGameBtn = document.getElementById('newGameBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const difficultyLabel = document.getElementById('difficulty-label');
const progressLabel = document.getElementById('progress-label');
const progressSidebar = document.getElementById('progress-sidebar');
const messagesContainer = document.getElementById('messages-container');

const CELL_W = 35;
const CELL_H = 35;
const COLS = 6;
const BALL_RADIUS = 13;

// -------- Difficulty settings --------
const DIFFICULTIES = {
    easy: {
        label: 'Easy',
        ballsPerColumn: 4,
        maxBalls: 8,
        totalRows: 8
    },
    medium: {
        label: 'Medium',
        ballsPerColumn: 5,
        maxBalls: 8,
        totalRows: 8
    },
    hard: {
        label: 'Hard',
        ballsPerColumn: 6,
        maxBalls: 8,
        totalRows: 8
    }
};

// -------- Motivational messages for progress --------
const PROGRESS_MESSAGES = {
    1: [
        '🌟 Great start! You\'ve completed 1 column!',
        '🎯 One down, five to go! Keep it up!',
        '💪 Excellent! You\'re on your way!'
    ],
    2: [
        '🎉 You\'re making great progress! 2 columns done!',
        '🌟 Halfway there! Keep pushing!',
        '💪 Fantastic! You\'ve got this!'
    ],
    3: [
        '🔥 You\'re on fire! 3 columns completed!',
        '🎯 You\'re halfway to victory!',
        '💪 Amazing work! Don\'t stop now!'
    ],
    4: [
        '🌟 Incredible! Only 2 columns to go!',
        '🎯 You\'re so close! Keep it up!',
        '💪 Almost there! You can do this!'
    ],
    5: [
        '🎉 ONE MORE COLUMN TO GO! You\'re almost there!',
        '🔥 You\'ve got this! The finish line is near!',
        '🌟 You\'re a true puzzle master!'
    ]
};

// -------- Game state --------
let currentDifficulty = 'hard';
let deques = {};
const colours = ['lime', 'red', 'blue', 'yellow', 'orange'];

// Drag state
let dragItem = null;
let sourceColumn = null;
let dragColor = null;

// Game stats
let moves = 0;
let startTime = null;
let bestTimes = {
    easy: null,
    medium: null,
    hard: null
};
let won = false;
let colDeq = [];
let bgColor = '#ffffff';
let ROWS = 8;
let previousCompleted = 0;

// -------- Utility: shuffle array --------
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// -------- Load best times from localStorage --------
function loadBestTimes() {
    const stored = localStorage.getItem('ballDropBestTimes');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            bestTimes = { ...bestTimes, ...parsed };
        } catch (e) {
            console.error('Failed to parse best times');
        }
    }
    updateBestTimesDisplay();
}

// -------- Save best times to localStorage --------
function saveBestTimes() {
    localStorage.setItem('ballDropBestTimes', JSON.stringify(bestTimes));
}

// -------- Update best times display --------
function updateBestTimesDisplay() {
    bestTimeEasy.textContent = bestTimes.easy ? bestTimes.easy.toFixed(2) + 's' : '—';
    bestTimeMedium.textContent = bestTimes.medium ? bestTimes.medium.toFixed(2) + 's' : '—';
    bestTimeHard.textContent = bestTimes.hard ? bestTimes.hard.toFixed(2) + 's' : '—';
}

// -------- Initialize deques based on difficulty --------
function initDeques(difficulty) {
    const config = DIFFICULTIES[difficulty];
    const ballsPerColumn = config.ballsPerColumn;
    const totalBalls = ballsPerColumn * 6;
    
    // Create a pool of colours (5 colours, distribute evenly)
    let colourPool = [];
    const coloursPerType = Math.floor(totalBalls / colours.length);
    const remainder = totalBalls % colours.length;
    
    for (let i = 0; i < colours.length; i++) {
        const count = coloursPerType + (i < remainder ? 1 : 0);
        for (let j = 0; j < count; j++) {
            colourPool.push(colours[i]);
        }
    }
    
    // Shuffle the pool
    shuffle(colourPool);
    
    // Distribute into deques
    const newDeques = {};
    let idx = 0;
    for (let j = 0; j < 6; j++) {
        const key = 'deque' + (j + 1);
        const dq = [];
        for (let i = 0; i < ballsPerColumn; i++) {
            dq.push(colourPool[idx]);
            idx++;
        }
        newDeques[key] = dq;
    }
    
    return newDeques;
}

// -------- Get random message for progress --------
function getRandomMessage(progress) {
    const messages = PROGRESS_MESSAGES[progress];
    if (!messages) return `🎯 ${progress}/6 columns completed!`;
    return messages[Math.floor(Math.random() * messages.length)];
}

// -------- Add message to sidebar --------
function addProgressMessage(progress) {
    const message = getRandomMessage(progress);
    const time = new Date().toLocaleTimeString();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'progress-message-item';
    
    const icon = ['🌟', '🎯', '💪', '🔥', '🎉'][progress - 1] || '🎯';
    messageDiv.innerHTML = `
        <span class="message-icon">${icon}</span>
        ${message}
        <span class="message-time">${time}</span>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    // Auto-scroll to show latest message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Limit messages to keep sidebar clean (keep last 20)
    while (messagesContainer.children.length > 20) {
        messagesContainer.removeChild(messagesContainer.firstChild);
    }
}

// -------- Count completed columns --------
function countCompletedColumns() {
    let completed = 0;
    for (let col = 1; col <= 6; col++) {
        const key = 'deque' + col;
        const dq = deques[key];
        if (dq.length === 0) continue;
        
        // Check if all balls in this column are the same color
        const first = dq[0];
        let allSame = true;
        for (let i = 1; i < dq.length; i++) {
            if (dq[i] !== first) {
                allSame = false;
                break;
            }
        }
        
        if (allSame) {
            completed++;
        }
    }
    return completed;
}

// -------- Check if game is won (REVERTED to original simple condition) --------
function isGameWon() {
    // Check if every column has all balls of the same color
    // Empty columns are NOT allowed for winning
    let allColumnsValid = true;
    
    for (let col = 1; col <= 6; col++) {
        const key = 'deque' + col;
        const dq = deques[key];
        
        // Empty columns are NOT allowed for winning
        if (dq.length === 0) {
            allColumnsValid = false;
            break;
        }
        
        // Check if all balls in this column are the same color
        const first = dq[0];
        for (let i = 1; i < dq.length; i++) {
            if (dq[i] !== first) {
                allColumnsValid = false;
                break;
            }
        }
        
        if (!allColumnsValid) break;
    }
    
    return allColumnsValid;
}

// -------- Reset game --------
function resetGame() {
    ROWS = DIFFICULTIES[currentDifficulty].totalRows;
    deques = initDeques(currentDifficulty);
    moves = 0;
    won = false;
    startTime = Date.now();
    colDeq = [];
    dragItem = null;
    sourceColumn = null;
    dragColor = null;
    previousCompleted = 0;
    messageOverlay.style.display = 'none';
    canvas.classList.remove('dragging', 'ball-hover');
    difficultyLabel.textContent = DIFFICULTIES[currentDifficulty].label;
    
    // Clear messages
    messagesContainer.innerHTML = '';
    
    // Show sidebar
    progressSidebar.style.display = 'block';
    
    updateDisplay();
    draw();
    updateProgress();
}

// -------- Update progress display --------
function updateProgress() {
    const completed = countCompletedColumns();
    progressLabel.textContent = `Progress: ${completed}/6`;
    
    // Check if new progress milestone reached
    if (completed > previousCompleted && !won) {
        previousCompleted = completed;
        if (completed > 0 && completed < 6) {
            addProgressMessage(completed);
        }
    }
    
    // Update label color based on progress
    if (completed === 6) {
        progressLabel.style.color = '#2d7d46';
        progressLabel.style.background = '#f0fff4';
    } else if (completed >= 4) {
        progressLabel.style.color = '#ecc94b';
        progressLabel.style.background = '#fffff0';
    } else if (completed >= 2) {
        progressLabel.style.color = '#4a6fa5';
        progressLabel.style.background = '#ebf4ff';
    }
}

// -------- Check win condition --------
function checkWin() {
    if (won) return true;
    
    // First, update progress
    updateProgress();
    
    // Check if game is won
    if (isGameWon()) {
        won = true;
        const elapsed = (Date.now() - startTime) / 1000;
        
        // Update best time for this difficulty
        if (bestTimes[currentDifficulty] === null || elapsed < bestTimes[currentDifficulty]) {
            bestTimes[currentDifficulty] = elapsed;
            saveBestTimes();
            updateBestTimesDisplay();
        }
        
        const message = `You solved the puzzle in ${moves} moves and ${elapsed.toFixed(2)} seconds!`;
        winMessage.textContent = message;
        if (bestTimes[currentDifficulty]) {
            bestTimeMessage.textContent = `🏆 Fastest ${DIFFICULTIES[currentDifficulty].label} time: ${bestTimes[currentDifficulty].toFixed(2)} seconds!`;
        } else {
            bestTimeMessage.textContent = '';
        }
        messageOverlay.style.display = 'flex';
        updateDisplay();
        draw();
        progressLabel.textContent = '🎉 COMPLETE! 🎉';
        progressLabel.style.color = '#2d7d46';
        progressLabel.style.background = '#f0fff4';
        return true;
    }
    return false;
}

// -------- Make a move --------
function makeMove(fromCol, toCol) {
    const fromKey = 'deque' + fromCol;
    const toKey = 'deque' + toCol;
    const maxBalls = DIFFICULTIES[currentDifficulty].maxBalls;

    if (deques[fromKey].length === 0) return false;
    if (deques[toKey].length >= maxBalls) return false;

    const color = deques[fromKey].shift();
    deques[toKey].unshift(color);
    moves++;
    colDeq = [];
    updateDisplay();
    draw();
    checkWin();
    return true;
}

// -------- Draw the board --------
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
            const x = col * CELL_W;
            const y = row * CELL_H;
            const key = 'deque' + (col + 1);
            const dq = deques[key];

            // Highlight completed columns
            const isColumnComplete = (() => {
                if (dq.length === 0) return false;
                const first = dq[0];
                for (let i = 1; i < dq.length; i++) {
                    if (dq[i] !== first) return false;
                }
                return true;
            })();

            ctx.fillStyle = isColumnComplete ? '#f0fff4' : 'white';
            ctx.strokeStyle = isColumnComplete ? '#48bb78' : '#ddd';
            ctx.lineWidth = isColumnComplete ? 2 : 0.5;
            ctx.fillRect(x, y, CELL_W, CELL_H);
            ctx.strokeRect(x, y, CELL_W, CELL_H);

            const ballIndex = row - (ROWS - dq.length);
            if (ballIndex >= 0 && ballIndex < dq.length) {
                const color = dq[ballIndex];
                const cx = x + CELL_W / 2;
                const cy = y + CELL_H / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, BALL_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }
        }
    }

    if (dragItem) {
        const cx = dragItem.x;
        const cy = dragItem.y;
        ctx.beginPath();
        ctx.arc(cx, cy, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = dragItem.color;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, BALL_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// -------- Update display --------
function updateDisplay() {
    movesDisplay.textContent = moves;
    if (startTime && !won) {
        const elapsed = (Date.now() - startTime) / 1000;
        timeDisplay.textContent = elapsed.toFixed(1);
    }
    if (bestTimes[currentDifficulty] !== null) {
        bestTimeDisplay.textContent = bestTimes[currentDifficulty].toFixed(2) + 's';
    } else {
        bestTimeDisplay.textContent = '—';
    }
}

// -------- Timer update --------
function updateTimer() {
    if (!won && startTime) {
        const elapsed = (Date.now() - startTime) / 1000;
        timeDisplay.textContent = elapsed.toFixed(1);
    }
    requestAnimationFrame(updateTimer);
}

// -------- Check if mouse is over a ball --------
function isOverBall(mouseX, mouseY) {
    const col = Math.floor(mouseX / CELL_W);
    const row = Math.floor(mouseY / CELL_H);
    
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    
    const key = 'deque' + (col + 1);
    const dq = deques[key];
    const ballIndex = row - (ROWS - dq.length);
    
    return (ballIndex >= 0 && ballIndex < dq.length);
}

// -------- Event: mouse move (for cursor changes) --------
function onMouseMoveCursor(e) {
    if (won || dragItem) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    if (isOverBall(mouseX, mouseY)) {
        canvas.classList.add('ball-hover');
        canvas.classList.remove('dragging');
    } else {
        canvas.classList.remove('ball-hover', 'dragging');
    }
}

// -------- Event: mouse down --------
function onMouseDown(e) {
    if (won) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(mouseX / CELL_W) + 1;
    const row = Math.floor(mouseY / CELL_H);

    if (col < 1 || col > 6) return;
    if (row < 0 || row >= ROWS) return;

    const key = 'deque' + col;
    const dq = deques[key];

    const ballIndex = row - (ROWS - dq.length);
    if (ballIndex >= 0 && ballIndex < dq.length) {
        sourceColumn = col;
        dragColor = dq.shift();
        dragItem = { x: mouseX, y: mouseY, color: dragColor };
        canvas.classList.add('dragging');
        canvas.classList.remove('ball-hover');
        draw();

        canvas.addEventListener('mousemove', onMouseMoveDrag);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
    } else {
        colDeq.push(col);
        if (colDeq.length === 2) {
            const fromCol = colDeq[1];
            const toCol = colDeq[0];
            if (fromCol !== toCol) {
                makeMove(fromCol, toCol);
            }
            colDeq = [];
        } else if (colDeq.length > 2) {
            colDeq = [col];
        }
    }
}

// -------- Event: mouse move (drag) --------
function onMouseMoveDrag(e) {
    if (!dragItem) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    dragItem.x = mouseX;
    dragItem.y = mouseY;

    const col = Math.floor(mouseX / CELL_W);
    draw();
    if (col >= 0 && col < COLS) {
        const x = col * CELL_W;
        ctx.fillStyle = 'rgba(144, 238, 144, 0.35)';
        ctx.fillRect(x, 0, CELL_W, canvas.height);
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                const key = 'deque' + (c + 1);
                const dq = deques[key];
                const ballIndex = r - (ROWS - dq.length);
                if (ballIndex >= 0 && ballIndex < dq.length) {
                    const cx = c * CELL_W + CELL_W / 2;
                    const cy = r * CELL_H + CELL_H / 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, BALL_RADIUS, 0, Math.PI * 2);
                    ctx.fillStyle = dq[ballIndex];
                    ctx.fill();
                    ctx.strokeStyle = '#222';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            }
        }
        if (dragItem) {
            const cx = dragItem.x;
            const cy = dragItem.y;
            ctx.beginPath();
            ctx.arc(cx, cy, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = dragItem.color;
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx, cy, BALL_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
}

// -------- Event: mouse up --------
function onMouseUp(e) {
    if (!dragItem) {
        canvas.removeEventListener('mousemove', onMouseMoveDrag);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('mouseleave', onMouseUp);
        canvas.classList.remove('dragging', 'ball-hover');
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const targetCol = Math.floor(mouseX / CELL_W) + 1;

    dragItem = null;
    canvas.classList.remove('dragging', 'ball-hover');

    canvas.removeEventListener('mousemove', onMouseMoveDrag);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mouseleave', onMouseUp);

    if (sourceColumn !== null && targetCol >= 1 && targetCol <= 6 && targetCol !== sourceColumn) {
        const toKey = 'deque' + targetCol;
        const maxBalls = DIFFICULTIES[currentDifficulty].maxBalls;
        if (deques[toKey].length < maxBalls) {
            deques[toKey].unshift(dragColor);
            moves++;
            colDeq = [];
            updateDisplay();
            draw();
            checkWin();
        } else {
            deques['deque' + sourceColumn].unshift(dragColor);
            draw();
        }
    } else {
        if (sourceColumn !== null) {
            deques['deque' + sourceColumn].unshift(dragColor);
            draw();
        }
    }

    sourceColumn = null;
    dragColor = null;
    dragItem = null;
    updateDisplay();
}

// -------- Start game with selected difficulty --------
function startGame(difficulty) {
    currentDifficulty = difficulty;
    document.getElementById('difficulty-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'inline-block';
    progressSidebar.style.display = 'block';
    resetGame();
}

// -------- Return to menu --------
function returnToMenu() {
    document.getElementById('game-container').style.display = 'none';
    progressSidebar.style.display = 'none';
    document.getElementById('difficulty-screen').style.display = 'flex';
    messageOverlay.style.display = 'none';
}

// -------- Init --------
function init() {
    // Load best times
    loadBestTimes();
    
    // Difficulty button listeners
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const level = this.dataset.level;
            startGame(level);
        });
    });
    
    // Game control listeners
    backToMenuBtn.addEventListener('click', returnToMenu);
    newGameBtn.addEventListener('click', resetGame);
    winPlayAgain.addEventListener('click', function() {
        messageOverlay.style.display = 'none';
        resetGame();
    });
    winClose.addEventListener('click', function() {
        messageOverlay.style.display = 'none';
    });
    
    // Canvas listeners
    canvas.addEventListener('mousemove', onMouseMoveCursor);
    canvas.addEventListener('mouseleave', function() {
        canvas.classList.remove('ball-hover', 'dragging');
    });
    canvas.addEventListener('mousedown', onMouseDown);
    
    // Start timer
    updateTimer();
}

// Start the game when page loads
init();