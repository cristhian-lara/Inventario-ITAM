import { Routes, Route, useLocation } from 'react-router-dom'
import TopNavbar from './components/TopNavbar'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import Collaborators from './pages/Collaborators'
import CollaboratorProfile from './pages/CollaboratorProfile'
import Settings from './pages/Settings'
import AssetProfile from './pages/AssetProfile'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import InactivityHandler from './components/InactivityHandler'

import Maintenances from './pages/Maintenances'
import MaintenanceSign from './pages/MaintenanceSign'
import Actas from './pages/Actas'
import Users from './pages/Users'

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app-container">
      {!isLoginPage && <InactivityHandler />}
      {!isLoginPage && <TopNavbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/assets" element={<ProtectedRoute module="assets"><Catalog /></ProtectedRoute>} />
          <Route path="/assets/:id" element={<ProtectedRoute module="assets"><AssetProfile /></ProtectedRoute>} />

          <Route path="/collaborators" element={<ProtectedRoute module="collaborators"><Collaborators /></ProtectedRoute>} />
          <Route path="/collaborators/:id" element={<ProtectedRoute module="collaborators"><CollaboratorProfile /></ProtectedRoute>} />

          <Route path="/maintenances" element={<ProtectedRoute module="maintenances"><Maintenances /></ProtectedRoute>} />
          <Route path="/maintenances/sign/:token" element={<MaintenanceSign />} />

          <Route path="/actas" element={<ProtectedRoute module="actas"><Actas /></ProtectedRoute>} />

          <Route path="/settings" element={<ProtectedRoute module="settings"><Settings /></ProtectedRoute>} />

          <Route path="/users" element={<ProtectedRoute module="users"><Users /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
