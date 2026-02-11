const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // URL del tuo ambiente React (Vite)
    methods: ["GET", "POST"],
    credentials: true
  }
});

const HOST_PASSWORD = "adminBuzz2026"; // Password per il conduttore
const PORT = process.env.PORT || 3004;

let buzzedTeams = [];
let isLocked = true; // All'inizio nessuno può premere
let timerSeconds = 10;
let countdown;
let connectedTeams = {};

let isHostAuthenticated = false;
let hostSocketId = null;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Un utente si è connesso:', socket.id);

    // 1. Blocco Registrazione Team
    socket.on('registerTeam', (name) => {
        if (!isHostAuthenticated) {
            // Inviamo un errore specifico al client
            return socket.emit('authError', 'Accesso negato: Il conduttore non è ancora attivo. Riprova più tardi.');
        }

        connectedTeams[socket.id] = name;
        io.emit('updateOnlineList', Object.values(connectedTeams));
    });



    // 2. Gestione Login Host migliorata
    socket.on('hostLogin', (password) => {
        if (password === HOST_PASSWORD) {
            isHostAuthenticated = true;
            hostSocketId = socket.id; // Memorizziamo chi è l'host
            socket.emit('authSuccess');
            console.log("Host autenticato correttamente.");
        } else {
            socket.emit('authError', 'Password errata');
        }
    });

    // 3. Gestione Disconnessione
    socket.on('disconnect', () => {
        // Se si disconnette l'host, resettiamo lo stato di sicurezza
        if (socket.id === hostSocketId) {
            console.log("L'Host si è disconnesso. Sessione bloccata.");
            isHostAuthenticated = false;
            hostSocketId = null;
            // Opzionale: puoi resettare tutto o lasciare che le squadre restino connesse
            // ma impossibilitate a fare nuove azioni finché l'host non torna.
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
        if (isLocked) return;

        const alreadyBuzzed = buzzedTeams.find(t => t.id === socket.id);
        if (!alreadyBuzzed) {
            const teamData = { id: socket.id, name: teamName, time: new Date().getTime() };
            buzzedTeams.push(teamData);

            // Se è il primo, invia segnale per il suono
            if (buzzedTeams.length === 1) {
                io.emit('firstBuzzSound');
            }

            io.emit('updateList', buzzedTeams);
        }
    });

    socket.on('reset', () => {
        buzzedTeams = [];
        isLocked = true;
        clearInterval(countdown);
        io.emit('updateList', []);
        io.emit('forceReset');
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