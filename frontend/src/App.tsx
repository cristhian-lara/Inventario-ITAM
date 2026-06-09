import { Routes, Route } from 'react-router-dom'
import TopNavbar from './components/TopNavbar'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import Collaborators from './pages/Collaborators'
import CollaboratorProfile from './pages/CollaboratorProfile'
import Settings from './pages/Settings'

import Maintenances from './pages/Maintenances'
import MaintenanceSign from './pages/MaintenanceSign'

function App() {
  return (
    <div className="app-container">
      <TopNavbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<Catalog />} />
          <Route path="/collaborators" element={<Collaborators />} />
          <Route path="/collaborators/:id" element={<CollaboratorProfile />} />
          <Route path="/maintenances" element={<Maintenances />} />
          <Route path="/maintenances/sign/:token" element={<MaintenanceSign />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
