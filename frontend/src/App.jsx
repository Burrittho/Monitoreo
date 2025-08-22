import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Monitor from './pages/Monitor.jsx'
import Reportes from './pages/Reportes.jsx'
import MonitorAnalytics from './pages/MonitorAnalytics.jsx'
import Layout from './components/layout/Layout.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/monitor" replace />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/monitor/analytics" element={<MonitorAnalytics />} />
          <Route path="/reportes" element={<Reportes />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
