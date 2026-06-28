import { NavLink } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Award,
  CalendarDays,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Mail,
  History,
  Shield,
  Users,
  Video,
  TicketPercent,
  X,
} from 'lucide-react';
import { usePermissions } from '../../context/PermissionContext';

const portalLinks = {
  tiesverse: [
    { name: 'Dashboard', path: '/tiesverse/dashboard', icon: LayoutDashboard, perms: [] },
    { name: 'Articles & Reports', path: '/tiesverse/articles', icon: FileText, perms: ['view_department', 'add_department', 'change_department', 'delete_department'] },
    { name: 'Team Members', path: '/tiesverse/team_members', icon: Users, perms: ['view_teammember', 'add_teammember', 'change_teammember', 'delete_teammember'] },
  ],
  career: [
    { name: 'Dashboard', path: '/career/dashboard', icon: LayoutDashboard, perms: [] },
    { name: 'Position Tracker', path: '/career/positions', icon: BriefcaseBusiness, perms: ['view_position', 'add_position', 'change_position', 'delete_position'] },
    { name: 'Application Tracker', path: '/career/applications', icon: FileText, perms: [] },
    { name: 'Offer Letters', path: '/career/offers', icon: Mail, perms: ['view_offerletter', 'add_offerletter', 'change_offerletter', 'delete_offerletter'] },
    { name: 'Form Gates', path: '/career/form_gates', icon: CheckSquare, perms: [] },
  ],
  webinar: [
    { name: 'Dashboard', path: '/webinar/dashboard', icon: LayoutDashboard, perms: [] },
    { name: 'Events', path: '/webinar/events', icon: CalendarDays, perms: ['view_event', 'add_event', 'change_event', 'delete_event'] },
    { name: 'Webinars & Workshops', path: '/webinar/webinars-workshops', icon: Video, perms: ['view_eventregistration', 'add_eventregistration', 'change_eventregistration', 'delete_eventregistration'] },
    { name: 'Speakers', path: '/webinar/event_speakers', icon: Users, perms: ['view_eventspeaker', 'add_eventspeaker', 'change_eventspeaker', 'delete_eventspeaker'] },
    { name: 'Registrations', path: '/webinar/registrations', icon: FileText, perms: ['view_registrationform'] },
    { name: 'Coupons', path: '/webinar/coupons', icon: TicketPercent, perms: [] },
  ],
  certificates: [
    { name: 'Templates', path: '/certificates/templates', icon: Award, perms: [] },
    { name: 'Generated Files', path: '/certificates/generated', icon: History, perms: [] },
  ],
  accounts: [
    { name: 'User Management', path: '/accounts/users', icon: Users, perms: [] },
    { name: 'Permissions', path: '/accounts/permissions', icon: Shield, perms: [] },
  ],
};

const portalNames = {
  tiesverse: ['Tiesverse Admin', 'Management Suite'],
  career: ['Career Admin', 'Talent Operations'],
  webinar: ['Webinar Admin', 'Event Operations'],
  certificates: ['Certificate Studio', 'Document Automation'],
  accounts: ['System Control', 'Access Management'],
};

const Sidebar = ({ activePortal, isOpen, onClose }) => {
  const { hasAnyPermission, isSuperuser } = usePermissions();
  const visibleLinks = (portalLinks[activePortal] || []).filter((link) => {
    if (activePortal === 'accounts') return isSuperuser;
    return link.perms.length === 0 || hasAnyPermission(link.perms);
  });
  const [title, subtitle] = portalNames[activePortal] || ['Admin Portal', 'Management Suite'];

  return (
    <>
      {isOpen && <button type="button" aria-label="Close menu" className="portal-sidebar-backdrop" onClick={onClose} />}
      <aside className={`portal-sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="portal-sidebar-brand">
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
          <button type="button" className="portal-sidebar-close" onClick={onClose} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="portal-sidebar-nav" aria-label={`${title} navigation`}>
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                to={link.path}
                key={link.path}
                onClick={onClose}
                className={({ isActive }) => `portal-sidebar-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{link.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="portal-sidebar-status">
          <span />
          System online
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
