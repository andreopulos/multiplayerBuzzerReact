import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import styles from '../styles/HostView.module.scss';
import buzzerSound from '../assets/buzzer.mp3'; // Importiamo il file audio

const HostView = () => {
  const socket = useSocket();
  const audioRef = useRef(null); // Riferimento per l'elemento audio

  // Stati
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onlineTeams, setOnlineTeams] = useState([]);
  const [buzzList, setBuzzList] = useState([]);
  const [duration, setDuration] = useState(10);

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

    return () => {
      socket.off('authSuccess');
      socket.off('authError');
      socket.off('updateOnlineList');
      socket.off('updateList');
      socket.off('firstBuzzSound');
    };
  }, [socket]);

  const handleLogin = () => socket.emit('hostLogin', password);
  const handleStart = () => socket.emit('startSession', parseInt(duration));
  const handleReset = () => socket.emit('reset');

  // Vista Login (Ex #auth)
  if (!isAuthenticated) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.card}>
          <h2>Accesso Controllo - Team GOG</h2>
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
          <button onClick={handleLogin} className={styles.loginBtn}>Accedi</button>
        </div>
      </div>
    );
  }

  // Vista Pannello (Ex #admin-panel)
  return (
    <div className={styles.adminContainer}>
      <audio ref={audioRef} src={buzzerSound} /> {/* Elemento audio invisibile */}

      <div className={styles.card}>
        <h2>Gestione Quiz - Team GOG</h2>
        
        <div className={styles.controls}>
          <input 
            type="number" 
            value={duration} 
            onChange={(e) => setDuration(e.target.value)} 
            className={styles.numInput}
          />
          <button onClick={handleStart} className={styles.startBtn}>AVVIA DOMANDA</button>
          <button onClick={handleReset} className={styles.resetBtn}>RESET</button>
        </div>

        <div className={styles.onlineSection}>
          <h3>Squadre Connesse: <span className={styles.count}>{onlineTeams.length}</span></h3>
          <div className={styles.onlineList}>
            {onlineTeams.map((name, i) => (
              <span key={i} className={styles.badge}>{name}</span>
            ))}
          </div>
        </div>

        <div className={styles.rankSection}>
          <h3>Ordine di prenotazione:</h3>
          <div className={styles.rankList}>
            {buzzList.map((team, i) => (
              <div key={team.id} className={`${styles.listItem} ${i === 0 ? styles.first : ''}`}>
                <span>{i + 1}. {team.name}</span>
                {i === 0 && <span className={styles.crown}>👑</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostView;