import React, { useState, useEffect, useRef, use } from 'react';
import { useSocket } from '../hooks/useSocket';
import styles from '../styles/HostView.module.scss';
import buzzerSound from '../assets/buzzer.mp3'; // Importiamo il file audio
import logoImg from '../assets/Logo_Team_GOG_new.png';
import Modal from '../components/Modal/Modal';
import logoEvent from '../assets/logo_gogabanda.png';

const HostView = () => {
  const socket = useSocket();
  const audioRef = useRef(null); // Riferimento per l'elemento audio

  // Stati
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onlineTeams, setOnlineTeams] = useState([]);
  const [buzzList, setBuzzList] = useState([]);
  const [duration, setDuration] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timer, setTimer] = useState(duration);
  const [advancedMode, setAdvancedMode] = useState(false);

  useEffect(() => {
    // Listeners Socket
    socket.on('authSuccess', () => setIsAuthenticated(true));
    socket.on('authError', (msg) => alert(msg));
    socket.on('updateOnlineList', (teams) => setOnlineTeams(teams));
    socket.on('updateList', (list) => setBuzzList(list));

    // Nuova logica per il suono: ascolta il segnale dal server
    socket.on('firstBuzzSound', () => {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Errore riproduzione audio:", e));
      }
    });

    socket.on('timerUpdate', (t) => setTimer(t));

    socket.on('forceReset', (newDuration) => {
      // Se il server ci rimanda una durata, usiamo quella, altrimenti la locale
      const fallbackDuration = newDuration || duration;
      setTimer(fallbackDuration);
    });

    return () => {
      socket.off('authSuccess');
      socket.off('authError');
      socket.off('updateOnlineList');
      socket.off('updateList');
      socket.off('firstBuzzSound');
      socket.off('timerUpdate');
      socket.off('forceReset');
    };
  }, [socket]);

  useEffect(() => {
    setTimer(duration);
  }, [duration]);

  const handleLogin = () => socket.emit('hostLogin', password);
  const handleStart = () => {
    socket.emit('startSession', parseInt(duration));
  }
  const handleReset = () => {
    socket.emit('reset', duration); 
  };

  const changeScore = (teamName, amount) => {
    socket.emit('updateScore', { teamName, amount });
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.authContainer}>
        <img src={logoImg} alt="Team GOG Logo" className={styles.logo} />
        <div className={styles.loginCard}>
          <h2>Accesso Controllo - Team GOG</h2>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
          <button onClick={handleLogin} className={styles.confirmButton}>Accedi</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <audio ref={audioRef} src={buzzerSound} /> {/* Elemento audio invisibile */}

      <div className={styles.card}>
        <h2>Gestione Quiz - Team GOG</h2>

        <div className={styles.timer}>
          <img src={logoEvent} alt="Timer" className={styles.logoEvent}/> <span>{timer}<small>sec</small></span>
        </div>
        <div className={styles.twoColumn} >
          <div className={styles.onlineSection}>
            <h3>Squadre Connesse: {onlineTeams.length}</h3>
            <div className={styles.onlineList}>
              {onlineTeams.map((team, i) => (
                  <span key={i} className={styles.badge}>
                    {team.name}: <strong>{team.score}</strong>
                  </span>
                ))}
            </div>
          </div>

          <div className={styles.rankSection}>
            <h3>Ordine di prenotazione:</h3>
            {buzzList.length === 0 ? (
              <span>Nessuna squadra ha buzzato</span>
            ) : (
              <div className={styles.rankList}>
                {buzzList.map((team, i) => (
                  <div key={team.id} className={`${styles.listItem}`}>
                    <span>{i + 1}. <strong>{team.name}</strong> in {team.time}sec</span>
                    {i === 0 && <span className={styles.crown}>👑</span>}
                      <button onClick={() => changeScore(team.name, 1)} className={styles.plusBtn}>🎵</button>
                      {advancedMode && <button onClick={() => changeScore(team.name, -1)} className={styles.minusBtn}>-1</button>}
                  </div>
                ))}
              </div>)}
          </div>
        </div>
      </div>


      <div className={styles.controlPanel}>
        <button onClick={handleStart} title='AVVIA DOMANDA' disabled={onlineTeams.length === 0}>▶️</button>
        <button onClick={handleReset} title='RESET DOMANDA' disabled={onlineTeams.length === 0}>🔄</button>
        <button onClick={() => setIsModalOpen(true)} title='SETTINGS'>⚙️</button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2>⚙️ IMPOSTAZIONI 🚧</h2>
        <div className={styles["settings-row"]}>
          <strong>TEMPO DOMANDA</strong>
          <input
            type="number"
            min="0"
            max="999"
            step="1"
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
          />
        </div>
          <div className={styles["settings-row"]}>
          <strong>ABILITA MOD. PUNTI</strong>
          <button
            onClick={() => {
              setAdvancedMode(true);
            }}
            title="ON"
            className={advancedMode ? `${styles.btnSelected}` : ""}
          >
            ON ☀️
          </button>
                    <button
            onClick={() => {
              setAdvancedMode(false);
            }}
            title="OFF"
            className={!advancedMode ? `${styles.btnSelected}` : ""}
          >
            OFF 🌛
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default HostView;