import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, Settings, Sun } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { usePermissions } from '../../context/PermissionContext';

const Navbar = ({ activePortal, setActivePortal, setIsSidebarOpen }) => {
  const { user, profile, logoutUser } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { hasAnyPermission, isSuperuser } = usePermissions();
  const navigate = useNavigate();

  const portals = [
    {
      key: 'tiesverse',
      label: 'Tiesverse Portal',
      show: hasAnyPermission([
        'view_event', 'add_event', 'change_event', 'delete_event',
        'view_article', 'add_article', 'change_article', 'delete_article',
        'view_youtubevideo', 'view_workshop', 'view_teammember', 'view_guest',
      ]),
    },
    {
      key: 'career',
      label: 'Career Portal',
      show: hasAnyPermission([
        'view_position', 'add_position', 'change_position', 'delete_position',
        'view_enrollment', 'view_offerletter',
      ]),
    },
    {
      key: 'webinar',
      label: 'Webinar Portal',
      show: hasAnyPermission([
        'view_webinarevent', 'add_webinarevent', 'change_webinarevent',
        'view_registrationform', 'view_calendarevent',
      ]),
    },
    { key: 'certificates', label: 'Certificate Generator', show: isSuperuser },
    { key: 'accounts', label: 'Users & Permissions', show: isSuperuser },
  ];

  const displayName = profile?.display_name || user?.username || 'Admin';
  const visiblePortals = portals
    .filter((portal) => portal.show)
    .sort((a, b) => Number(b.key === activePortal) - Number(a.key === activePortal));
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <header className="portal-topbar">
      <div className="portal-topbar-left">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="portal-menu-button"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
        <nav className="portal-switcher" aria-label="Switch portal">
          {visiblePortals.map((portal) => (
            <button
              type="button"
              key={portal.key}
              className={activePortal === portal.key ? 'is-active' : ''}
              onClick={() => setActivePortal(portal.key)}
            >
              {portal.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="portal-topbar-actions">
        <button type="button" onClick={() => navigate('/accounts/settings')} aria-label="Profile settings" title="Settings">
          <Settings size={19} />
        </button>
        <button type="button" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <span className="portal-user-avatar" title={displayName}>{initials || 'TV'}</span>
        <button type="button" onClick={logoutUser} aria-label="Log out" title="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
