import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewReportPage from './pages/NewReportPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/report/new" element={<NewReportPage />} />
    </Routes>
  );
}

export default App;
