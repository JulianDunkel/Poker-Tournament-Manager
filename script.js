const config = {
    blindLevels: [
        {small: 50, big: 100, time: 5},
        {small: 100, big: 200, time: 5},
        {color_up: true},
        {small: 100, big: 200, time: 5},
        {small: 100, big: 200, time: 5},
        {small: 100, big: 200, time: 5},
    ],
    potDistribution: [50, 30, 20], // in percentages
    startingChips: 1000,
    buyIn: 3,
    rebuy: 2,
    reentry: 3,
    numberAllowedRebuys: 1,
    numberAllowedReentries: 1,
    blindLevelRebuysAllowed: 3, // until which level rebuys are allowed
    blindLevelReentriesAllowed: 3, // until which level reentries are allowed
    finalTableSize: 6,
};

const blindOverviewEl = document.getElementById('blindOverview');
const playerListEl = document.getElementById('playerList');
const playerAddBtn = document.getElementById('playerAddBtn');
const playerNameInput = document.getElementById('playerNameInput');
const addToTablesBtn = document.getElementById('addToTablesBtn');
const table1El = document.getElementById('table1');
const table2El = document.getElementById('table2');
const resetStateBtn = document.getElementById('resetStateBtn');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const previousLevelBtn = document.getElementById('prevLevelBtn');
const currentBlindEl = document.getElementById('currentBlind');
const timeDisplayEl = document.getElementById('timeDisplay');
const nextBlindEl = document.getElementById('nextBlind');
const regroupBtn = document.getElementById('regroupBtn');
const resetGameBtn = document.getElementById('resetGameBtn');
const potSizeEl = document.getElementById('pot-size');
const potDistributionEl = document.getElementById('pot-distribution');

let playerIdCounter = 1;
const init_state = {
    players: [],
    timer: {timerInterval: null, isRunning: false, remainingSeconds: config.blindLevels[0].time},
    currentLevel: 0,
};
let state = structuredClone(init_state);

function init() {
    loadStateFromCookie();
    renderBlindOverview();
    renderPlayers();
    renderTables();
    renderTimer();
    renderPot();
}

function potSize() {
    let total = 0;
    for (const player of state.players) {
        if (!player.noPartOfPot && player.expenses) {
            total += player.expenses;
        }
    }
    return total;
}

function calculatePotDistribution() {
    const pSize = potSize();
    const share = [];
    const dist = config.potDistribution;
    const totalPot = pSize;

    let sum = 0;
    for (let i = 0; i < dist.length; i++) {
        share[i] = Math.floor((dist[i] / 100) * totalPot);
        sum += share[i];
    }
    for (let i = 0; i < totalPot - sum; i++) {
        share[i % share.length] += 1;
    }
    return share;
}


function renderPot() {
    const pSize = potSize();
    potSizeEl.innerText = `${pSize} €`;
    let distText = '';

    share = calculatePotDistribution();
    
    for (let i = 0; i < share.length; i++) {
        distText += `${i + 1}. ${share[i]} € `;
    }
    potDistributionEl.innerText = distText.trim();
}

function renderTimer() {
    if (config.blindLevels[state.currentLevel].color_up) {
        timeDisplayEl.innerText = 'Color-Up';
    } else {
        timeDisplayEl.innerText = formatTime(state.timer.remainingSeconds);
        currentBlindEl.innerText = `${config.blindLevels[state.currentLevel].small}/${config.blindLevels[state.currentLevel].big}`;
    }
    if (state.currentLevel < config.blindLevels.length - 1) {
        if (config.blindLevels[state.currentLevel + 1].color_up) {
            nextBlindEl.innerText = 'Nächstes: Color-Up';
            return;
        } else {
            nextBlindEl.innerText = `Nächstes: ${config.blindLevels[state.currentLevel + 1].small}/${config.blindLevels[state.currentLevel + 1].big}`;
        }
    } else {
        nextBlindEl.innerText = 'Nächstes: —';
    }
}

function renderBlindOverview() {
    blindOverviewEl.innerHTML = '';
    for (let i = 0; i < config.blindLevels.length; i++) {
        const level = config.blindLevels[i];
        const levelEl = document.createElement('span');
        levelEl.classList.add(state.currentLevel === i ? 'blind-current' : state.currentLevel > i ? 'blind-passed' : 'blind-upcoming');
        levelEl.innerText = level.color_up ? 
        `${i + 1}. Color-Up\n` : `${i + 1}. ${level.small}/${level.big} (${Math.round(level.time/60)} min)\n`;
        blindOverviewEl.appendChild(levelEl);
    }
}

function getBereinigtenPlatz(player) {
    return player.place - state.players.filter(p => p.noPartOfPot && p.place !== -1 && p.place < player.place).length;
}

function renderPlayers() {
    playerListEl.innerHTML = '';
    for (const player of state.players.sort((a,b) => (a.place | 0) - (b.place | 0))) {
        const playerEl = document.createElement('div');
        playerEl.dataset.id = player.id;
        playerEl.classList.add('player-row');
        playerEl.innerHTML = `<div>
          <strong>${player.name}</strong> ${player.status == "pleite" || player.status == "GEWINNER" ? player.place + "." : ""} ${(player.status == "pleite" || player.status == "GEWINNER") && !player.noPartOfPot && getBereinigtenPlatz(player) <= config.potDistribution.length ? "(" + calculatePotDistribution()[getBereinigtenPlatz(player) - 1] + "€)" : ""}<br>
          <small class="muted">${player.status == "aktiv" ? "Tisch " + player.table + " • " : ""}${player.status} •  ${player.noPartOfPot === true ? "Ohne" : "Mit"}</small>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn small" ${
            (player.status != "aktiv" && player.reentry >= config.numberAllowedRebuys)
            || (player.status != "aktiv" && state.currentLevel >= config.blindLevelReentriesAllowed)
            || (player.status == "aktiv" && player.rebuy >= config.numberAllowedRebuys)
            || (player.status == "aktiv" && state.currentLevel >= config.blindLevelRebuysAllowed)
            || player.status == "nicht zugeordnet" ? 'style="visibility: hidden;' : ""} data-act="buy" data-id="${player.id}">${player.status == "aktiv" ? "Rebuy" : "Reentry"}</button>
          <button class="btn small ghost" data-act="remove" data-id="${player.id}">Entf</button>
        </div>`;
        playerListEl.appendChild(playerEl);
    }
    playerListEl.querySelectorAll('.player-row').forEach(el => {
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();           
            const id = Number(el.dataset.id);
            const player = state.players.find(p => p.id === id);
            player.noPartOfPot = !player.noPartOfPot;
            renderPot();
            renderPlayers();
        });
    });
    playerListEl.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = Number(btn.dataset.id);
            const a = btn.dataset.act;
            const player = state.players.find(p => p.id === id);
            if(a === 'buy') {
                if (player.status == 'aktiv') {
                    // handle rebuy
                    if (player.rebuy >= config.numberAllowedRebuys) {
                        alert('Dieser Spieler hat bereits die maximale Anzahl an Rebuys erreicht.');
                        return;
                    }
                    if (state.currentLevel >= config.blindLevelRebuysAllowed) {
                        alert('Rebuys sind in diesem Level nicht mehr erlaubt.');
                        return;
                    }
                    player.rebuy += 1;
                    player.expenses += config.rebuy;
                    renderPot();
                    renderPlayers();
                } else {
                    // handle reentry
                    if (player.reentry >= config.numberAllowedReentries) {
                        alert('Dieser Spieler hat bereits die maximale Anzahl an Reentries erreicht.');
                        return;
                    }
                    if (state.currentLevel >= config.blindLevelReentriesAllowed) {
                        alert('Reentries sind in diesem Level nicht mehr erlaubt.');
                        return;
                    }
                    player.reentry += 1;
                    player.expenses += config.reentry;
                    player.place = -1;

                    player.status = 'aktiv';

                    const numActivePlayers = state.players.filter(p => p.status === 'aktiv').length;
                    for (const p of state.players) {
                        if (p.status === 'pleite' && p.place <= numActivePlayers) {
                            p.place += 1;
                        }
                    }
                    renderTables();
                    renderPot();
                    renderPlayers();
                }
            } else if(a === 'remove') {
                removePlayer(id);
            }
            renderPlayers();
        });
    });

}

function renderTables(){
  table1El.innerHTML=''; table2El.innerHTML='';
  const t1 = state.players.filter(p => p.table===1 && p.status === 'aktiv');
  const t2 = state.players.filter(p => p.table===2 && p.status === 'aktiv');
  placeSeats(t1, table1El);
  placeSeats(t2, table2El);
}

function knockOutPlayer(id) {
    const player = state.players.find(p => p.id === id);
    if (player) {
        player.status = 'pleite';
        player.place = state.players.filter(p => p.status === 'aktiv').length + 1;
        if (player.place === 2) {
            state.players.filter(p => p.status === 'aktiv').forEach(p => {
                p.place = 1;
                p.status = 'GEWINNER';
            });
        }
    }
}

function placeSeats(arr, tableEl){
  const W = tableEl.clientWidth || 420;
  const H = tableEl.clientHeight || 220;
  const cx = W/2, cy = H/2;
  const rx = W*0.42, ry = H*0.36;
  const n = Math.max(1, arr.length);
  // if few players, place on lower semicircle; else full circle
  let start = -Math.PI/2 - Math.PI/1.5;
  let end = -Math.PI/2 + Math.PI/1.5;
  if(n > 8){ start = -Math.PI; end = Math.PI; }
  const step = (end - start) / Math.max(1, n-1);
  arr.forEach((p,i)=>{
    const angle = start + step * i;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    const div = document.createElement('div');
    div.className = 'seat';
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.textContent = (i+1) + ": " + p.name;
    if (p.status === 'pleite') {
        div.classList.add('knocked-out');
    }
    div.addEventListener('click', () => {
        if (p.status === 'aktiv') {
            div.classList.add('knocked-out');
            knockOutPlayer(p.id);
        } else {
            div.classList.remove('knocked-out');
            renderTables();
        }
        renderPlayers();
    });
    tableEl.appendChild(div);
    setTimeout(()=>div.classList.add('show'), 120 + i*100);
    div.title = `${p.name} (${p.status})`;
  });
}

function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

function addPlayer(name) {
    state.players.push({ id: playerIdCounter++, name: name, table: -1, status: 'nicht zugeordnet', rebuy: 0, reentry: 0, expenses: config.buyIn, noPartOfPot: false, place: -1 });
}

function removePlayer(id) {
    state.players = state.players.filter(p => p.id !== id);
}


function calculateTables() {
    const activePlayers = state.players.filter(p => p.status === 'aktiv');
    shuffle(activePlayers);
    
    const half = Math.ceil(activePlayers.length / 2);

    for (let i = 0; i < activePlayers.length; i++) {
        activePlayers[i].table = i < half ? 1 : 2;
    }
}

function regroup() {
    const table1 = state.players.filter(p => p.status === 'aktiv' && p.table === 1);
    const table2 = state.players.filter(p => p.status === 'aktiv' && p.table === 2);


    if (table1.length + table2.length <= config.finalTableSize) {
        // move all to table 1
        for (const p of table2) {
            p.table = 1;
        }
        alert("Final Table erreicht!\nAlle Spieler wurden an Tisch 1 gesetzt.");
    } else if (table1.length > table2.length + 1) {
        // move some from table 1 to table 2
        const toMove = Math.floor((table1.length - table2.length) / 2);
        let msg = "Folgende Spieler wurden an Tisch 2 verschoben:\n";

        for (let i = 0; i < toMove; i++) {
            const playerToMove = table1[Math.floor(Math.random() * table1.length)];
            table1.splice(table1.indexOf(playerToMove), 1);
            table2.push(playerToMove);
            playerToMove.table = 2;
            msg += `- ${playerToMove.name}\n`;
        }
        alert(msg);
    } else if (table2.length > table1.length + 1) {
        // move some from table 2 to table 1
        const toMove = Math.floor((table2.length - table1.length) / 2);
        let msg = "Folgende Spieler wurden an Tisch 1 verschoben:\n";

        for (let i = 0; i < toMove; i++) {
            const playerToMove = table2[Math.floor(Math.random() * table2.length)];
            table2.splice(table2.indexOf(playerToMove), 1);
            table1.push(playerToMove);
            playerToMove.table = 1;
            msg += `- ${playerToMove.name}\n`;
        }
        alert(msg);
    }
}


/* Events */
playerAddBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        addPlayer(playerName);  
    } else {
        alert('Bitte einen Spielernamen eingeben.');
    }
    playerNameInput.value = '';
    renderPlayers();
    renderPot();
});
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        playerAddBtn.click();
    }
});
addToTablesBtn.addEventListener('click', () => {
    for (const player of state.players) {
        if (player.status === 'nicht zugeordnet')
            player.status = 'aktiv';
    }
    calculateTables();
    renderTables();
    renderPlayers();
});
resetStateBtn.addEventListener('click', () => {
    if (confirm('Möchten Sie den Spielstand wirklich zurücksetzen? Alle Daten gehen verloren.')) {
        state = structuredClone(init_state);
        renderBlindOverview();
        renderPlayers();
        renderTables();
        renderTimer();
        renderPot();
    }
    
});

resetGameBtn.addEventListener('click', () => {
    if (confirm('Möchten Sie den Spielstand zurücksetzen? Nur die Spieler bleiben erhalten.')) {
        state.currentLevel = 0;
        state.timer = {timerInterval: null, isRunning: false, remainingSeconds: config.blindLevels[0].time};
        state.players.forEach(p => {
            p.table = -1;
            p.status = 'nicht zugeordnet';
            p.rebuy = 0;
            p.reentry = 0;
            p.place = -1;
            p.expenses = config.buyIn;
        });
        renderBlindOverview();
        renderPlayers();
        renderTables();
        renderTimer();
        renderPot();
    }
});

startPauseBtn.addEventListener('click', () => {
    if (config.blindLevels[state.currentLevel].color_up) {
        alert('Der Timer kann während eines Color-Ups nicht gestartet werden.');
        return;
    }
    if (state.timer.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

resetTimerBtn.addEventListener('click', () => {
    resetTimer();
});

nextLevelBtn.addEventListener('click', () => {
    nextLevel(false);
});

previousLevelBtn.addEventListener('click', () => {
    previousLevel();
});

regroupBtn.addEventListener('click', () => {
    regroup();
    renderPlayers();
    renderTables(); 
});


// Timer helper
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function startTimer() {
    startPauseBtn.innerText = 'Pause';
    if (state.timer.isRunning) return; // already running
    state.timer.isRunning = true;
    if (state.timer.timerInterval) return; // already running
    state.timer.timerInterval = setInterval(() => {
        if (state.timer.remainingSeconds > 0) { 
            state.timer.remainingSeconds -= 1;
            timeDisplayEl.innerText = formatTime(state.timer.remainingSeconds);
        } else {

            
            playSound(2);

            if (state.currentLevel === config.blindLevelRebuysAllowed) {
                alert('Rebuys sind jetzt nicht mehr erlaubt.');
            }
            if (state.currentLevel === config.blindLevelReentriesAllowed) {
                alert('Reentries sind jetzt nicht mehr erlaubt.');
            }

            if (state.currentLevel + 1 < config.blindLevels.length
                && !config.blindLevels[state.currentLevel + 1].color_up
                && state.currentLevel !== config.blindLevelRebuysAllowed
                && state.currentLevel !== config.blindLevelReentriesAllowed
            ) {
                nextLevel(true)
            } else {
                nextLevel(false);
            }
            
        }
    }, 1000);
}

function pauseTimer() {
    startPauseBtn.innerText = 'Start';
    state.timer.isRunning = false;
    if (state.timer.timerInterval) {
        clearInterval(state.timer.timerInterval);
        state.timer.timerInterval = null;
    }
}

function resetTimer() {
    pauseTimer();
    state.timer.remainingSeconds = config.blindLevels[state.currentLevel].time;
    timeDisplayEl.innerText = formatTime(state.timer.remainingSeconds);
}

function nextLevel(run) {
    if (state.currentLevel < config.blindLevels.length - 1) {
        state.currentLevel += 1;
        state.timer.remainingSeconds = config.blindLevels[state.currentLevel].time;
        if (!run) {
            timeDisplayEl.innerText = formatTime(state.timer.remainingSeconds);
            pauseTimer();
        }
        renderBlindOverview();
        renderTimer();
        renderPlayers();
    }
}
function previousLevel() {
    if (state.currentLevel > 0) {
        pauseTimer();
        state.currentLevel -= 1;
        state.timer.remainingSeconds = config.blindLevels[state.currentLevel].time;
        timeDisplayEl.innerText = formatTime(state.timer.remainingSeconds);
        renderBlindOverview();
        renderTimer();
    }
}

// Cookie helpers & state persist
function setCookie(name, value, days) {
  const expires = days ? "; expires=" + new Date(Date.now() + days*24*60*60*1000).toUTCString() : "";
  document.cookie = name + "=" + value + expires + "; path=/";
}
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g,'\\$1') + '=([^;]*)'));
  return m ? m[1] : null;
}

function saveStateToCookie() {
  try {
    const payload = {
      players: state.players,
      timer: state.timer,
      currentLevel: state.currentLevel,
      playerIdCounter
    };
    const str = encodeURIComponent(JSON.stringify(payload));
    setCookie('poker_state', str, 30); // 30 Tage
  } catch (e) {
    console.warn('Could not save state to cookie', e);
  }
}

function loadStateFromCookie() {
  const raw = getCookie('poker_state');
  if (!raw) return;
  try {
    const data = JSON.parse(decodeURIComponent(raw));
    if (data && typeof data === 'object') {
      if (Array.isArray(data.players)) state.players = data.players;
      if (typeof data.currentLevel === 'number') state.currentLevel = data.currentLevel;
      if (typeof data.playerIdCounter === 'number') playerIdCounter = data.playerIdCounter;
      if (typeof data.timer === 'object') state.timer = data.timer;
    }
  } catch (e) {
    console.warn('Failed to load state cookie, ignoring', e);
  }
}

// Save on window close
window.addEventListener('beforeunload', saveStateToCookie);


init();






