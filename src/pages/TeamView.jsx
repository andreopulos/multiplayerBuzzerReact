import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import styles from '../styles/TeamView.module.scss';
import logoImg from '../assets/Logo_Team_GOG_new.png';
import logoEvent from '../assets/logo_gogabanda.png';
import button from '../assets/button.png';

const TeamView = () => {
  const socket = useSocket();

  // Stati per gestire l'interfaccia
  const [name, setName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState('In attesa della domanda... ♾️');
  const [timer, setTimer] = useState('⏳');
  const [isBtnDisabled, setIsBtnDisabled] = useState(true);
  const [myScore, setMyScore] = useState(0);
  const [duelActive, setDuelActive] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);

  // Funzione per il Buzz (memorizzata con useCallback per l'event listener)
  const handleBuzz = useCallback(() => {
    if (isBtnDisabled || !isRegistered) return;
    
    socket.emit('buzz', name);
    setIsBtnDisabled(true);
    setStatus('Hai premuto! 🎉');
  }, [isBtnDisabled, isRegistered, name, socket]);

  // Gestione Socket e Tastiera
  useEffect(() => {
    // Listeners Socket
    socket.on('sessionStarted', () => {
      setIsBtnDisabled(false);
      setStatus('Vai, vai, vai! 🚀');
    });

    socket.on('timerUpdate', (t) => setTimer(t));

    socket.on('sessionEnded', () => {
      setIsBtnDisabled(true);
      setStatus('⏰ Tempo scaduto! ⏰');
    });

    socket.on('forceReset', (newTimer) => {
      setIsBtnDisabled(true);
      setStatus('In attesa della domanda... ♾️');
      if (newTimer) setTimer(newTimer);
      else setTimer('⏳');
    });

    socket.on('authError', (msg) => {
      alert(msg);
      setIsRegistered(false);
    });

    // Listener Tastiera (Barra Spaziatrice)
    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault(); // Impedisce lo scroll della pagina
        handleBuzz();
      }
    };

    socket.on('duelStarted', (data) => {
      setDuelActive(true);
      checkMyTurn(data);
    });

    socket.on('updateDuelState', (data) => {
      const myIdx = data.teams.findIndex(t => t.name === name);
      if (myIdx !== -1) {
        setTimer(data.timers[myIdx].toFixed(1)); // Mostra i propri secondi
        const isMyTurn = data.currentTurnIndex === myIdx;
        setIsBtnDisabled(!isMyTurn || !data.isTimerRunning);
        setStatus(isMyTurn ? "TOCCA A TE! 🎤" : `Attendi ${data.teams[data.currentTurnIndex].name}...`);
      }
    });

    window.addEventListener('keydown', handleKeyDown);

    socket.on('updateOnlineList', (teams) => {
        const me = teams.find(t => t.name === name);
        if (me) setMyScore(me.score);
      });

    const checkMyTurn = (data) => {
      const currentTeamName = data.teams[data.currentTurnIndex].name;
      // Se il nome della mia squadra corrisponde a quella di turno, abilito
      if (name === currentTeamName) {
        setIsMyTurn(true);
        setIsBtnDisabled(false);
        setStatus('È IL TUO TURNO! ⚔️');
      } else {
        setIsMyTurn(false);
        setIsBtnDisabled(true);
        setStatus(`Tocca a ${currentTeamName}... ⏳`);
      }
    };

    // Cleanup: rimuoviamo tutto quando il componente "muore"
    return () => {
      socket.off('sessionStarted');
      socket.off('timerUpdate');
      socket.off('sessionEnded');
      socket.off('forceReset');
      socket.off('authError');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [socket, name, handleBuzz]);

  const handleRegister = () => {
    if (!name.trim()) return alert("Inserisci un nome!");
    socket.emit('registerTeam', name);
    setIsRegistered(true);
  };

  return (
    <div className={styles.mainContainer}>
      {/* <img src={logoImg} alt="Team GOG Logo" className={styles.logo} /> */}
      <img src={logoEvent} alt="Team GOG Event Logo" className={styles.logoEvent}/>
      {!isRegistered ? (
        <div className={styles.container}>
          <h1>🥳 Entra nel gioco ✨</h1>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome Squadra" 
            className={styles.input}
          />
          <button className={styles.confirmButton} onClick={handleRegister}>
            Conferma
          </button>
        </div>
      ) : (
        <div className={styles.container}>
          <div className={styles.timerDisplay}>{timer}{timer !== '⏳' && <span><small>sec</small></span>}</div>
          <button 
            className={styles.buzzer2} 
            disabled={isBtnDisabled} 
            onClick={handleBuzz}
          >
            <img src={button} alt="Team GOG Logo" />
          </button>
          <div className={styles.scoreBoard}>
            Punti: {myScore}
          </div>
          <div className={styles.status}>{status}</div>
        </div>
      )}
    </div>
  );
};

export default TeamView;