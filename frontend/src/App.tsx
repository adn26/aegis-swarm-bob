import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuditDashboard from './pages/AuditDashboard';
import RedTeamReport from './pages/RedTeamReport';
import BlueTeamReport from './pages/BlueTeamReport';
import Layout from './components/layout/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/audit/:id" element={<AuditDashboard />} />
        <Route path="/report/red-team/:id" element={<RedTeamReport />} />
        <Route path="/report/blue-team/:id" element={<BlueTeamReport />} />
      </Routes>
    </Layout>
  );
}

export default App;

// Made with Bob
