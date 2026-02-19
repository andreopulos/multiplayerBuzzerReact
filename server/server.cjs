const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    path: '/teamGOG/multiplayer-buzzer/socket.io/',
    cors: {
        origin: "https://imgs.gruppomol.lcl", // URL del tuo ambiente React (Vite)
        methods: ["GET", "POST"],
        credentials: true
    }
});

const HOST_PASSWORD = "adminGog2026"; // Password per il conduttore
const PORT = process.env.PORT || 6666;

let buzzedTeams = [];
let isLocked = true; // All'inizio nessuno può premere
let timerSeconds = 10;
let countdown;
let connectedTeams = {};

let isHostAuthenticated = false;
let hostSocketId = null;
let sessionStartTime = 0;

let duelMode = false;
let duelState = {
    teams: [],
    currentTurnIndex: 0,
    timers: [30, 30],
    isTimerRunning: false,
    results: [Array(7).fill(null), Array(7).fill(null)], // Griglia 7x2
    currentQuestionIndices: [0, 0], // Indice della domanda attuale per ogni team
    winner: null,
    isWaitingForResult: false,
    winner: null
};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Un utente si è connesso:', socket.id);
    // Definiamo una funzione per resettare lo stato del duello per riutilizzarla
    function resetDuelState() {
        return {
            teams: [],
            currentTurnIndex: 0,
            timers: [30, 30],
            isTimerRunning: false,
            results: [Array(7).fill(null), Array(7).fill(null)],
            currentQuestionIndices: [0, 0],
            winner: null,
            isWaitingForResult: false
        };
    }
    // Registrazione Team
    socket.on('registerTeam', (name) => {
        if (!isHostAuthenticated) {
            return socket.emit('authError', 'Accesso negato: Il conduttore non è ancora attivo. Riprova più tardi.');
        }

        connectedTeams[socket.id] = { name: name, score: 0 };
        io.emit('updateOnlineList', Object.values(connectedTeams));
    });


    socket.on('updateScore', ({ teamName, amount }) => {
        const teamEntry = Object.entries(connectedTeams).find(([id, data]) => data.name === teamName);

        if (teamEntry) {
            const [id, data] = teamEntry;
            connectedTeams[id].score += amount;
            io.emit('updateOnlineList', Object.values(connectedTeams));
        }
    });

    // 2. Gestione Login Host migliorata
    socket.on('hostLogin', (password) => {
        if (password === HOST_PASSWORD) {
            isHostAuthenticated = true;
            hostSocketId = socket.id;
            socket.emit('authSuccess');
            console.log("Host autenticato correttamente.");
        } else {
            socket.emit('authError', 'Password errata');
        }
    });

    // 3. Gestione Disconnessione
    socket.on('disconnect', () => {
        if (socket.id === hostSocketId) {
            console.log("L'Host si è disconnesso. Sessione bloccata.");
            isHostAuthenticated = false;
            hostSocketId = null;
            duelMode = false;
            io.emit('duelEnded');
        }

        if (connectedTeams[socket.id]) {
            delete connectedTeams[socket.id];
            io.emit('updateOnlineList', Object.values(connectedTeams));
        }
    });

    // Avvio Sessione (Timer)
    socket.on('startSession', (seconds) => {
        buzzedTeams = [];
        isLocked = false;
        timerSeconds = seconds;
        sessionStartTime = Date.now();
        io.emit('sessionStarted', { seconds: timerSeconds });
        io.emit('updateList', []);

        clearInterval(countdown);
        let timeLeft = timerSeconds;

        countdown = setInterval(() => {
            timeLeft--;
            io.emit('timerUpdate', timeLeft);
            if (timeLeft <= 0) {
                isLocked = true;
                clearInterval(countdown);
                io.emit('sessionEnded');
            }
        }, 1000);
    });

    // Gestione Buzz
    socket.on('buzz', (teamName) => {
        if (duelMode && duelState.isTimerRunning) {
            const currentTeam = duelState.teams[duelState.currentTurnIndex];
            // Solo la squadra di turno può stoppare il timer
            if (currentTeam.name === teamName) {
                clearInterval(countdown);
                duelState.isTimerRunning = false;
                duelState.isWaitingForResult = true;
                io.emit('updateDuelState', duelState);
                //io.emit('firstBuzzSound'); // Opzionale: suono quando stoppano
                return; // Esci, non serve la logica del buzz normale
            }
        }

        if (isLocked) return;
        const alreadyBuzzed = buzzedTeams.find(t => t.id === socket.id);
        if (!alreadyBuzzed) {
            const now = Date.now();
            const reactionTime = (now - sessionStartTime) / 1000;
            const teamData = { id: socket.id, name: teamName, time: reactionTime.toFixed(2) };
            buzzedTeams.push(teamData);

            if (buzzedTeams.length === 1) {
                io.emit('firstBuzzSound');
            }

            io.emit('updateList', buzzedTeams);

            const totalTeams = Object.keys(connectedTeams).length;
            if (buzzedTeams.length >= totalTeams) {
                isLocked = true;
                clearInterval(countdown);
                io.emit('sessionEnded');
                console.log("Tutte le squadre hanno risposto. Timer fermato.");
            }
        }
    });

    socket.on('reset', (newDuration) => {
        buzzedTeams = [];
        isLocked = true;
        clearInterval(countdown);

        duelMode = false;
        duelState = resetDuelState();

        if (newDuration) {
            timerSeconds = newDuration;
        }

        io.emit('updateList', []);
        io.emit('timerUpdate', timerSeconds);
        io.emit('forceReset', timerSeconds);

        // Avvisa tutti i client che il duello è terminato/cancellato
        io.emit('duelEnded');
    });

    socket.on('startDuelMode', () => {
        const teams = Object.values(connectedTeams);
        if (teams.length === 2) {
            duelMode = true;
            duelState.teams = teams;
            duelState.currentTurnIndex = 0;
            duelState.questionsLeft = { team0: 7, team1: 7 };
            io.emit('duelStarted', duelState);
        }
    });

    socket.on('nextDuelTurn', (result) => {
        if (!duelMode) return;

        // Salva risultato se presente (ESATTA, ERRATA, PASSO)
        const currentKey = `team${duelState.currentTurnIndex}`;
        if (result) {
            duelState.results[currentKey].push(result);
            duelState.questionsLeft[currentKey]--;
        }

        // Cambia turno (0 -> 1 o 1 -> 0)
        duelState.currentTurnIndex = duelState.currentTurnIndex === 0 ? 1 : 0;

        // Ferma timer precedente e resetta per il nuovo turno
        clearInterval(countdown);
        isLocked = true;

        io.emit('updateDuelState', duelState);
    });

    socket.on('start7x30', () => {
        const teams = Object.values(connectedTeams);
        if (teams.length === 2) {
            duelMode = true;
            duelState = resetDuelState(); // Usa la funzione per pulire tutto
            duelState.teams = teams;
            io.emit('duelStarted', duelState);
        }
    });

    socket.on('toggleDuelTimer', () => {
        if (!duelMode || duelState.isWaitingForResult) return;

        if (duelState.isTimerRunning) {
            clearInterval(countdown);
            duelState.isTimerRunning = false;
        } else {
            duelState.isTimerRunning = true;
            countdown = setInterval(() => {
                const idx = duelState.currentTurnIndex;
                duelState.timers[idx] -= 0.1; // Sottrae decimi di secondo

                if (duelState.timers[idx] <= 0) {
                    duelState.timers[idx] = 0;
                    clearInterval(countdown);
                    duelState.isTimerRunning = false;
                    // Se scade il tempo, vince l'avversario
                    duelState.winner = duelState.teams[idx === 0 ? 1 : 0].name;
                }
                io.emit('updateDuelState', duelState);
            }, 100);
        }
        io.emit('updateDuelState', duelState);
    });

    socket.on('duelAction', (type) => { // type: 'CORRECT', 'WRONG', 'PASS'
        if (!duelMode || duelState.winner) return;

        duelState.isWaitingForResult = false;

        clearInterval(countdown);
        duelState.isTimerRunning = false;
        const teamIdx = duelState.currentTurnIndex;
        const qIdx = duelState.currentQuestionIndices[teamIdx];

        // Registra il risultato
        duelState.results[teamIdx][qIdx] = type;

        // Controllo Vittoria: 7 risposte corrette
        const correctCount = duelState.results[teamIdx].filter(r => r === 'CORRECT').length;
        if (correctCount === 7) {
            duelState.winner = duelState.teams[teamIdx].name;
            io.emit('updateDuelState', duelState);
            return;
        }

        // Logica recupero "PASSO" e avanzamento
        const findNextIndex = (current, results) => {
            // 1. Cerca la prossima domanda mai risposta (null) dopo quella attuale
            for (let i = current + 1; i < 7; i++) {
                if (results[i] === null) return i;
            }
            // 2. Se non ce ne sono dopo, ricomincia dall'inizio cercando il primo null
            for (let i = 0; i < 7; i++) {
                if (results[i] === null) return i;
            }
            // 3. Se non ci sono più null, cerca il primo "PASS" da recuperare
            for (let i = 0; i < 7; i++) {
                if (results[i] === 'PASS') return i;
            }
            return current;
        };

        duelState.currentQuestionIndices[teamIdx] = findNextIndex(qIdx, duelState.results[teamIdx]);

        // Cambia turno
        duelState.currentTurnIndex = (teamIdx === 0) ? 1 : 0;
        io.emit('updateDuelState', duelState);
    });
});

// 1. Serve i file statici dalla cartella dist (dove andrà il build di React)
app.use(express.static(path.join(__dirname, '../client/dist')));

// 2. Gestisce il Routing di React (per far funzionare /admin anche al refresh)

// Se ancora dà errore, usa:
// Nota: NON usare le virgolette intorno a /.*/
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`MultiplayerBuzzer server running on port ${PORT}`);
});