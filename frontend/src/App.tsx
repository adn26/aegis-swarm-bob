import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuditDashboard from './pages/AuditDashboard';
import Layout from './components/layout/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/audit/:id" element={<AuditDashboard />} />
      </Routes>
    </Layout>
  );
}

export default App;

// Made with Bob
