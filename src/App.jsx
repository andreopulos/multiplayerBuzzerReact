import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import TeamView from './pages/TeamView';
import HostView from './pages/HostView';

import './styles/main.scss';


const TitleManager = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/host") {
      document.title = "Host Team GOG | Multiplayer Buzzer";
    } else {
      document.title = "Team GOG | Multiplayer Buzzer";
    }
  }, [location]);
  return null;
}

function App() {
  return (
    <Router>
      <TitleManager />
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