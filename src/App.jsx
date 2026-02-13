import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import TeamView from './pages/TeamView';
import HostView from './pages/HostView';

// Importiamo lo stile globale o i moduli SCSS
import './styles/main.scss';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          
          <Route path="/" element={<TeamView />} />

          <Route path="/host" element={<HostView />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;