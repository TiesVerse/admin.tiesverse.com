import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionContext';
import { Globe, Briefcase, Video, Shield, Award } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasAnyPermission, isSuperuser } = usePermissions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activePortal = location.pathname.startsWith('/career')
    ? 'career'
    : location.pathname.startsWith('/webinar')
      ? 'webinar'
      : location.pathname.startsWith('/certificates')
        ? 'certificates'
      : location.pathname.startsWith('/accounts')
        ? 'accounts'
        : 'tiesverse';

  // When portal changes via navbar, redirect to its first link
  const handlePortalChange = (portal) => {
    if (portal === 'tiesverse') navigate('/tiesverse/dashboard');
    if (portal === 'career') navigate('/career/dashboard');
    if (portal === 'webinar') navigate('/webinar/dashboard');
    if (portal === 'certificates') navigate('/certificates/templates');
    if (portal === 'accounts') navigate('/accounts/users');
  };

  const canSeeTiesverse = hasAnyPermission([
    'view_event', 'add_event', 'change_event', 'delete_event',
    'view_article', 'add_article', 'change_article', 'delete_article',
    'view_youtubevideo', 'view_workshop', 'view_teammember', 'view_guest',
  ]);

  const canSeeCareer = hasAnyPermission([
    'view_position', 'add_position', 'change_position', 'delete_position',
    'view_enrollment', 'view_offerletter',
  ]);

  const canSeeWebinar = hasAnyPermission([
    'view_webinarevent', 'add_webinarevent', 'change_webinarevent',
    'view_registrationform', 'view_calendarevent',
  ]);

  const portalButtons = [
    { key: 'tiesverse', label: 'Tiesverse', icon: <Globe size={20} />, show: canSeeTiesverse },
    { key: 'career', label: 'Career', icon: <Briefcase size={20} />, show: canSeeCareer },
    { key: 'webinar', label: 'Webinar', icon: <Video size={20} />, show: canSeeWebinar },
    { key: 'certificates', label: 'Certificates', icon: <Award size={20} />, show: isSuperuser },
    { key: 'accounts', label: 'System', icon: <Shield size={20} />, show: isSuperuser },
  ];

  return (
    <div className="admin-shell">
      <Sidebar 
        activePortal={activePortal} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="admin-main">
        <Navbar 
          activePortal={activePortal} 
          setActivePortal={handlePortalChange} 
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <main className="admin-page custom-scrollbar">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="portal-mobile-nav">
          {portalButtons.filter(p => p.show).map(portal => (
            <button 
              key={portal.key}
              onClick={() => handlePortalChange(portal.key)}
              className="flex flex-col items-center justify-center w-full h-full gap-1 cursor-pointer border-none bg-transparent"
              style={{
                color: activePortal === portal.key ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {portal.icon}
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{portal.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
