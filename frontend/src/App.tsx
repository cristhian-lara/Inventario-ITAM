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
import { Role } from './context/AuthContext'

import Maintenances from './pages/Maintenances'
import MaintenanceSign from './pages/MaintenanceSign'

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app-container">
      {!isLoginPage && <TopNavbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          <Route path="/assets" element={<ProtectedRoute allowedRoles={[Role.ADMINISTRADOR]}><Catalog /></ProtectedRoute>} />
          <Route path="/assets/:id" element={<ProtectedRoute allowedRoles={[Role.ADMINISTRADOR]}><AssetProfile /></ProtectedRoute>} />
          
          <Route path="/collaborators" element={<ProtectedRoute allowedRoles={[Role.ADMINISTRADOR]}><Collaborators /></ProtectedRoute>} />
          <Route path="/collaborators/:id" element={<ProtectedRoute allowedRoles={[Role.ADMINISTRADOR]}><CollaboratorProfile /></ProtectedRoute>} />
          
          <Route path="/maintenances" element={<ProtectedRoute allowedRoles={[Role.ADMINISTRADOR]}><Maintenances /></ProtectedRoute>} />
          <Route path="/maintenances/sign/:token" element={<MaintenanceSign />} />
          
          <Route path="/settings" element={<ProtectedRoute allowedRoles={[Role.ADMINISTRADOR]}><Settings /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
