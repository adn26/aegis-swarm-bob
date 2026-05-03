import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Home from './pages/Home';
import Audits from './pages/Audits';
import Settings from './pages/Settings';
import AuditDashboard from './pages/AuditDashboard';
import RedTeamReport from './pages/RedTeamReport';
import BlueTeamReport from './pages/BlueTeamReport';
import Layout from './components/layout/Layout';
import BootSequence from './components/layout/BootSequence';

function App() {
  const [booting, setBooting] = useState(true);

  const handleBootComplete = () => {
    setBooting(false);
  };

  return (
    <>
      {booting && <BootSequence onComplete={handleBootComplete} />}
      {!booting && (
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/audits" element={<Audits />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/audit/:id" element={<AuditDashboard />} />
            <Route path="/report/red-team/:id" element={<RedTeamReport />} />
            <Route path="/report/blue-team/:id" element={<BlueTeamReport />} />
          </Routes>
        </Layout>
      )}
    </>
  );
}

export default App;

// Made with Bob
