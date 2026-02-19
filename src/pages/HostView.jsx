import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import styles from '../styles/HostView.module.scss';
import buzzerSound from '../assets/buzzer.mp3'; // Importiamo il file audio
import logoImg from '../assets/Logo_Team_GOG_new.png';
import Modal from '../components/Modal/Modal';
import logoEvent from '../assets/logo_gogabanda.png';
import Numbers from 'number-to-emoji';


const HostView = () => {
  const socket = useSocket();
  const audioRef = useRef(null);

  // Stati
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onlineTeams, setOnlineTeams] = useState([]);
  const [buzzList, setBuzzList] = useState([]);
  const [duration, setDuration] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timer, setTimer] = useState(duration);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [duelData, setDuelData] = useState(null);


  useEffect(() => {
    // Listeners Socket
    socket.on('authSuccess', () => setIsAuthenticated(true));
    socket.on('authError', (msg) => alert(msg));
    socket.on('updateOnlineList', (teams) => setOnlineTeams(teams));
    socket.on('updateList', (list) => setBuzzList(list));


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

    socket.on('duelStarted', (data) => setDuelData(data));
    socket.on('updateDuelState', (data) => setDuelData(data));

    socket.on('duelEnded', () => {
      setDuelData(null);
    });

    return () => {
      socket.off('authSuccess');
      socket.off('authError');
      socket.off('updateOnlineList');
      socket.off('updateList');
      socket.off('firstBuzzSound');
      socket.off('timerUpdate');
      socket.off('forceReset');
      socket.off('duelStarted');
      socket.off('updateDuelState');
      socket.off('duelEnded');
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

  const handleChangeScore = (teamName, amount) => {
    socket.emit('updateScore', { teamName, amount });
  };

  const handleStartDuel = () => socket.emit('startDuelMode');
  const handleDuelResult = (result) => socket.emit('nextDuelTurn', result);

  const toggleTimer = () => socket.emit('toggleDuelTimer');
  const handleAction = (type) => socket.emit('duelAction', type);
  const start7x30 = () => socket.emit('start7x30');
  const toggleDuelTimer = () => socket.emit('toggleDuelTimer');
  const duelAction = (type) => socket.emit('duelAction', type);

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
        <h2>GOGabanda - Team GOG</h2>
        {!duelData ? (
          <>
            <div className={styles.timer}>
              <img src={logoEvent} alt="Timer" className={styles.logoEvent} /> <span>{timer}<small>sec</small></span>
            </div>
            <div className={styles.twoColumn} >
              <div className={styles.onlineSection}>
                <h3>Squadre Connesse: {onlineTeams.length}</h3>
                <div className={styles.onlineList}>
                  {onlineTeams.sort((a, b) => b.score - a.score).map((team, i) => (
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

                        <span>{i + 1}. {i === 0 && <span className={styles.crown}>👑</span>}<strong>{team.name}</strong> <small>in {team.time}sec</small></span>
                        <button onClick={() => handleChangeScore(team.name, 1)} className={styles.plusBtn}>🎵</button>
                        {advancedMode && <button onClick={() => handleChangeScore(team.name, -1)} className={styles.minusBtn}>-1</button>}
                      </div>
                    ))}
                  </div>)}
              </div>
            </div>
          </>
        )
          : (
            <div className={styles.sarabandaContainer}>
              <img src={logoEvent} alt="Timer" className={styles.logoEvent} />
              {duelData.winner && (
                <div className={styles.winnerAnnounce}>
                  🎉 IL VINCITORE È: {duelData.winner} 🎉
                </div>
              )}

              <div className={styles.duelFlex}>
                {duelData.teams.map((team, tIdx) => (
                  <div key={tIdx} className={`${styles.teamDuelBox} ${duelData.currentTurnIndex === tIdx ? styles.active : ""}`}>

                    <div className={styles.timerLarge}>{duelData.timers[tIdx].toFixed(1)}s</div>
                    <div className={styles.squareGrid}>
                      {duelData.results[tIdx].map((res, qIdx) => {
                        const isCurrentTurn = duelData.currentTurnIndex === tIdx;
                        const isCurrentQuestion = qIdx === duelData.currentQuestionIndices[tIdx];

                        return (
                          <div
                            key={qIdx}
                            className={`
                              ${styles.square} 
                              ${res ? styles[res] : ""} 
                              ${(isCurrentTurn && isCurrentQuestion && !duelData.winner) ? styles.activePointer : ""}
                            `}
                          >
                            {Numbers.toEmoji(qIdx + 1)}
                          </div>
                        );
                      })}
                    </div>
                    <h3 className={styles.teamName}>{team.name}</h3>
                  </div>
                ))}
              </div>



              {!duelData.winner && (
                <div className={styles.controls}>

                </div>
              )}
            </div>
          )}

      </div>


      <div className={styles.controlPanel}>        
        {!duelData && (
          <>
            <button onClick={handleStart} title='AVVIA DOMANDA' disabled={onlineTeams.length === 0}>▶️</button>
            <button onClick={handleReset} title='RESET DOMANDA' disabled={onlineTeams.length === 0}>🔄</button>
            <button onClick={() => setIsModalOpen(true)} title='SETTINGS'>⚙️</button>
          </>
        )}
        {onlineTeams.length === 2 && !duelData && (
          <button onClick={handleStartDuel} title='AVVIA 7x30' className={`${styles.duelBtn} ${styles.gold}`}>⚔️</button>
        )}
        {duelData && (
          <>
            <button
              onClick={toggleDuelTimer}
              className={styles.playBtn}
              disabled={duelData.isWaitingForResult || !!duelData.winner} // Disabilitato se c'è un buzz pendente
              style={{ opacity: duelData.isWaitingForResult ? 0.5 : 1 }}
            >
              {duelData.isTimerRunning ? "⏸ STOP" : "▶️ MOOSECA 🎶"}
            </button>
            <button onClick={() => duelAction('CORRECT')} className={styles.btnOk}>✅</button>
            <button onClick={() => duelAction('WRONG')} className={styles.btnErr}>❌</button>
            <button onClick={() => duelAction('PASS')} className={styles.btnPass}>🟡</button>
            <button onClick={handleReset} title='RESET DOMANDA' disabled={onlineTeams.length === 0}>🔄</button>
          </>
        )}
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