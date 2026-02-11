import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importiamo le "Viste" (che creeremo tra un attimo)
import TeamView from './pages/TeamView';
import HostView from './pages/HostView';

// Importiamo lo stile globale o i moduli SCSS
import './styles/main.scss';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Rotta per i giocatori */}
          <Route path="/" element={<TeamView />} />

          {/* Rotta per il conduttore (puoi chiamarla come vuoi per sicurezza, es. /regia-gog) */}
          <Route path="/admin" element={<HostView />} />

          {/* Redirect se l'utente sbaglia URL */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;