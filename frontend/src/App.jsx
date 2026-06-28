import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

// Auth & Accounts
import Login from './pages/Login';
import UserManagement from './pages/Accounts/UserManagement';
import PermissionsManagement from './pages/Accounts/PermissionsManagement';
import ProfileSettings from './pages/Accounts/ProfileSettings';

// Dashboards
import TiesverseDashboard from './pages/Tiesverse/TiesverseDashboard';
import CareerDashboard from './pages/Career/CareerDashboard';
import WebinarDashboard from './pages/Webinar/WebinarDashboard';
import Registrations from './pages/Webinar/Registrations.jsx';
import Coupons from './pages/Webinar/Coupons.jsx';

// Tiesverse
import EventsManagement from './pages/Tiesverse/EventsManagement';
import TiesverseAdminPanel from './pages/Tiesverse/Admin.jsx';

// Career
import CareerAdmin from './pages/Career/Admin.jsx';

// Certificate Generator
import CertificateTemplates from './pages/Certificates/CertificateTemplates.jsx';
import CertificateEditor from './pages/Certificates/CertificateEditor.jsx';
import CertificateGenerate from './pages/Certificates/CertificateGenerate.jsx';
import GeneratedCertificates from './pages/Certificates/GeneratedCertificates.jsx';

// Webinar
import { ManagingList, UserSubmissionsReview } from './pages/Webinar/index.jsx';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionProvider>
          <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/tiesverse/dashboard" replace />} />

            <Route element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              {/* Accounts Routes */}
              <Route path="/accounts/users" element={<UserManagement />} />
              <Route path="/accounts/permissions" element={<PermissionsManagement />} />
              <Route path="/accounts/settings" element={<ProfileSettings />} />

              {/* Dashboard Routes */}
              <Route path="/tiesverse/dashboard" element={<TiesverseDashboard />} />
              <Route path="/career/dashboard" element={<CareerDashboard />} />
              <Route path="/webinar/dashboard" element={<WebinarDashboard />} />

              {/* Tiesverse Routes */}
              <Route path="/tiesverse/events" element={<Navigate to="/webinar/events" replace />} />
              <Route path="/tiesverse/articles" element={<TiesverseAdminPanel tab="departments" />} />
              <Route path="/tiesverse/departments" element={<Navigate to="/tiesverse/articles" replace />} />
              <Route path="/tiesverse/team_members" element={<TiesverseAdminPanel tab="team_members" />} />

              {/* Career Routes */}
              <Route path="/career/positions" element={<CareerAdmin tab="positions" />} />
              <Route path="/career/applications" element={<CareerAdmin tab="applications" />} />
              <Route path="/career/enrollments" element={<Navigate to="/career/applications" replace />} />
              <Route path="/career/offers" element={<CareerAdmin tab="offers" />} />
              <Route path="/career/candidates" element={<Navigate to="/career/applications" replace />} />
              <Route path="/career/form_gates" element={<CareerAdmin tab="form_gates" />} />

              {/* Certificate Generator Routes */}
              <Route path="/certificates/templates" element={<CertificateTemplates />} />
              <Route path="/certificates/templates/:id/editor" element={<CertificateEditor />} />
              <Route path="/certificates/templates/:id/generate" element={<CertificateGenerate />} />
              <Route path="/certificates/generated" element={<GeneratedCertificates />} />

              {/* Webinar Routes */}
              <Route path="/webinar/submissions" element={<ManagingList />} />
              <Route path="/webinar/events" element={<EventsManagement />} />
              <Route path="/webinar/calendar" element={<UserSubmissionsReview />} />
              <Route path="/webinar/event_speakers" element={<TiesverseAdminPanel tab="event_speakers" />} />
              <Route path="/webinar/webinars-workshops" element={<TiesverseAdminPanel tab="event_registrations" />} />
              <Route path="/webinar/registrations" element={<Registrations />} />
              <Route path="/webinar/coupons" element={<Coupons />} />
              <Route path="/webinar/event_registrations" element={<TiesverseAdminPanel tab="event_registrations" />} />
            </Route>
          </Routes>
        </Router>
      </PermissionProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
