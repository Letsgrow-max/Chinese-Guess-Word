// --- State Management ---
let gameData = [];
let coins = parseInt(localStorage.getItem('guessWordCoins')) || 0;
let completedLevels = JSON.parse(localStorage.getItem('guessWordCompleted')) || [];

let currentLevelData = null;
let currentStars = 0;
let discoveredAnswers = [];
let wrongTaps = new Set();
const HINT_COST = 20;

// --- DOM Elements ---
const screens = {
    home: document.getElementById('screen-home'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result')
};
const ui = {
    coinCount: document.getElementById('coin-count'),
    btnBack: document.getElementById('btn-back'),
    levelList: document.getElementById('level-list'),
    
    // Game elements
    targetChar: document.getElementById('target-char'),
    targetPinyin: document.getElementById('target-pinyin'),
    targetEn: document.getElementById('target-en'),
    targetCn: document.getElementById('target-cn'),
    starContainer: document.getElementById('star-container'),
    btnHint: document.getElementById('btn-hint'),
    foundCount: document.getElementById('found-count'),
    totalCount: document.getElementById('total-count'),
    discoveredList: document.getElementById('discovered-list'),
    tileGrid: document.getElementById('tile-grid'),
    
    // Result elements
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    rewardCoins: document.getElementById('reward-coins'),
    btnNext: document.getElementById('btn-next'),
    btnHome: document.getElementById('btn-home')
};

// --- Initialization ---
async function init() {
    updateCoinDisplay();
    try {
        const response = await fetch('levels.json');
        gameData = await response.json();
        renderHome();
    } catch (error) {
        console.error("Failed to load levels.json", error);
        ui.levelList.innerHTML = "<p>Error loading levels. Are you running this via a web server?</p>";
    }

    // Event Listeners
    ui.btnBack.addEventListener('click', navigateHome);
    ui.btnHome.addEventListener('click', navigateHome);
    ui.btnNext.addEventListener('click', loadNextLevel);
    ui.btnHint.addEventListener('click', useHint);
}

function updateCoinDisplay() {
    ui.coinCount.innerText = coins;
    localStorage.setItem('guessWordCoins', coins);
}

// --- Navigation ---
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
    
    if (screenName === 'home') {
        ui.btnBack.classList.add('hidden');
        renderHome();
    } else {
        ui.btnBack.classList.remove('hidden');
    }
}

function navigateHome() {
    showScreen('home');
}

// --- Home Screen Logic ---
function renderHome() {
    ui.levelList.innerHTML = '';
    gameData.forEach(level => {
        const btn = document.createElement('button');
        btn.classList.add('level-btn');
        if (completedLevels.includes(level.id)) {
            btn.classList.add('completed');
        }
        btn.innerText = level.id;
        btn.addEventListener('click', () => startLevel(level));
        ui.levelList.appendChild(btn);
    });
}

// --- Game Logic ---
function startLevel(level) {
    currentLevelData = level;
    currentStars = level.stars;
    discoveredAnswers = [];
    wrongTaps.clear();
    
    // Populate Target Card
    ui.targetChar.innerText = level.target;
    ui.targetPinyin.innerText = level.pinyin;
    ui.targetEn.innerText = level.english;
    ui.targetCn.innerText = level.chinese;
    
    // Setup Progress
    ui.totalCount.innerText = level.answers.length;
    updateProgressUI();
    
    // Setup Grid (Shuffle options)
    const shuffledOptions = [...level.options].sort(() => Math.random() - 0.5);
    ui.tileGrid.innerHTML = '';
    
    shuffledOptions.forEach(char => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.innerText = char;
        tile.dataset.char = char;
        tile.addEventListener('click', () => handleTileTap(tile, char));
        ui.tileGrid.appendChild(tile);
    });

    renderStars();
    updateHintButton();
    showScreen('game');
}

function handleTileTap(tileElement, char) {
    if (tileElement.classList.contains('locked') || currentStars <= 0) return;

    if (currentLevelData.answers.includes(char)) {
        // Correct Answer
        tileElement.classList.add('locked');
        discoveredAnswers.push(char);
        updateProgressUI();
        
        if (discoveredAnswers.length === currentLevelData.answers.length) {
            setTimeout(winLevel, 500);
        }
    } else {
        // Wrong Answer
        if (!wrongTaps.has(char)) {
            wrongTaps.add(char);
            currentStars--;
            renderStars();
        }
        
        // Flash red
        tileElement.classList.add('wrong');
        setTimeout(() => {
            tileElement.classList.remove('wrong');
        }, 400);

        if (currentStars <= 0) {
            setTimeout(loseLevel, 500);
        }
    }
}

function renderStars() {
    ui.starContainer.innerHTML = '⭐'.repeat(currentStars) + '❌'.repeat(currentLevelData.stars - currentStars);
}

function updateProgressUI() {
    ui.foundCount.innerText = discoveredAnswers.length;
    ui.discoveredList.innerHTML = '';
    discoveredAnswers.forEach(char => {
        const div = document.createElement('div');
        div.classList.add('discovered-tile');
        div.innerText = char;
        ui.discoveredList.appendChild(div);
    });
}

// --- Hint System ---
function updateHintButton() {
    if (coins < HINT_COST || discoveredAnswers.length === currentLevelData.answers.length) {
        ui.btnHint.disabled = true;
    } else {
        ui.btnHint.disabled = false;
    }
}

function useHint() {
    if (coins < HINT_COST) return;
    
    // Find an answer not yet discovered
    const missingAnswers = currentLevelData.answers.filter(a => !discoveredAnswers.includes(a));
    if (missingAnswers.length === 0) return;
    
    const hintChar = missingAnswers[0];
    
    // Deduct coins
    coins -= HINT_COST;
    updateCoinDisplay();
    updateHintButton();
    
    // Visually trigger the correct tile
    const tiles = Array.from(document.querySelectorAll('.tile'));
    const targetTile = tiles.find(t => t.dataset.char === hintChar);
    if (targetTile) {
        handleTileTap(targetTile, hintChar);
    }
}

// --- End Game States ---
function winLevel() {
    if (!completedLevels.includes(currentLevelData.id)) {
        completedLevels.push(currentLevelData.id);
        localStorage.setItem('guessWordCompleted', JSON.stringify(completedLevels));
    }
    
    const reward = 10 + currentStars; // Bonus for leftover stars
    coins += reward;
    updateCoinDisplay();
    
    ui.resultTitle.innerText = "Level Complete!";
    ui.resultTitle.style.color = "var(--primary-color)";
    ui.resultMessage.innerText = `You mastered the character ${currentLevelData.target}.`;
    ui.rewardCoins.innerText = reward;
    
    // Hide Next button if it's the last level
    const isLastLevel = currentLevelData.id === gameData[gameData.length - 1].id;
    ui.btnNext.style.display = isLastLevel ? 'none' : 'block';
    
    showScreen('result');
}

function loseLevel() {
    ui.resultTitle.innerText = "Out of Stars!";
    ui.resultTitle.style.color = "var(--error-color)";
    ui.resultMessage.innerText = "You tapped too many incorrect strokes. Try again!";
    ui.rewardCoins.innerText = "0";
    
    // Change "Next" button to "Try Again"
    ui.btnNext.innerText = "Try Again";
    ui.btnNext.style.display = 'block';
    
    // Temporarily overwrite click handler for this specific failure
    ui.btnNext.onclick = () => {
        ui.btnNext.innerText = "Next Level"; // reset text
        ui.btnNext.onclick = loadNextLevel;  // reset handler
        startLevel(currentLevelData);
    };
    
    showScreen('result');
}

function loadNextLevel() {
    const currentIndex = gameData.findIndex(l => l.id === currentLevelData.id);
    if (currentIndex < gameData.length - 1) {
        startLevel(gameData[currentIndex + 1]);
    }
}

// Boot the app
init();
