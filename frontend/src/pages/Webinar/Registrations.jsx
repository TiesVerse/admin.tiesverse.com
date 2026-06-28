import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  Search,
  TicketCheck,
  Users,
  Video,
} from 'lucide-react';
import { getWebinarRegistrations } from '../../apiClient';
import './Registrations.css';

const normalizeType = (value) => String(value || 'event').trim().toLowerCase();

const formatDate = (value, withTime = false) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed);
};

const registrationStatus = (registration) => {
  const paymentStatus = String(registration.payment_status || '').toLowerCase();
  if (paymentStatus === 'failed') return { label: 'Payment failed', tone: 'danger' };
  if (paymentStatus === 'pending') return { label: 'Payment pending', tone: 'warning' };
  if (paymentStatus === 'paid') return { label: 'Paid', tone: 'success' };
  return { label: 'Confirmed', tone: 'success' };
};

export default function Registrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getWebinarRegistrations();
      if (response?.error) {
        setError(response.error);
        setRegistrations([]);
      } else {
        setRegistrations(Array.isArray(response) ? response : []);
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load registrations.');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadRegistrations, 0);
    return () => window.clearTimeout(timer);
  }, [loadRegistrations]);

  const webinarCount = registrations.filter((item) => normalizeType(item.event_type) === 'webinar').length;
  const eventCount = registrations.length - webinarCount;
  const confirmedCount = registrations.filter((item) => {
    const status = String(item.payment_status || 'free').toLowerCase();
    return status === 'free' || status === 'paid' || status === 'success';
  }).length;

  const visibleRegistrations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return registrations.filter((item) => {
      const itemType = normalizeType(item.event_type);
      const matchesType = type === 'all'
        || (type === 'webinar' && itemType === 'webinar')
        || (type === 'event' && itemType !== 'webinar');
      if (!matchesType) return false;
      if (!needle) return true;
      return [
        item.name,
        item.email,
        item.phone,
        item.city,
        item.event_title,
      ].some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [query, registrations, type]);

  const metrics = [
    { label: 'All registrations', value: registrations.length, icon: Users, tone: 'violet' },
    { label: 'Webinar registrations', value: webinarCount, icon: Video, tone: 'blue' },
    { label: 'Event registrations', value: eventCount, icon: CalendarDays, tone: 'amber' },
    { label: 'Confirmed', value: confirmedCount, icon: CheckCircle2, tone: 'green' },
  ];

  return (
    <div className="registration-page">
      <header className="registration-header">
        <div>
          <span className="registration-eyebrow">Attendee operations</span>
          <h1>Registrations</h1>
          <p>View every webinar and event registration received through the public registration flow.</p>
        </div>
        <button type="button" className="registration-refresh" onClick={loadRegistrations} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'is-spinning' : ''} />
          Refresh
        </button>
      </header>

      <section className="registration-metrics" aria-label="Registration totals">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <article className="registration-metric" key={label}>
            <span className={`registration-metric-icon is-${tone}`}><Icon size={21} /></span>
            <div><small>{label}</small><strong>{value}</strong></div>
          </article>
        ))}
      </section>

      <section className="registration-panel">
        <div className="registration-toolbar">
          <label className="registration-search">
            <Search size={18} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search attendee, email, city, or event"
              aria-label="Search registrations"
            />
          </label>
          <div className="registration-filters" aria-label="Filter registrations by type">
            {[
              ['all', 'All'],
              ['webinar', 'Webinars'],
              ['event', 'Events'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={type === value ? 'is-active' : ''}
                onClick={() => setType(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="registration-error">{error}</div>}

        {loading ? (
          <div className="registration-state"><RefreshCw size={24} className="is-spinning" /><p>Loading registrations…</p></div>
        ) : visibleRegistrations.length === 0 ? (
          <div className="registration-state">
            <TicketCheck size={34} />
            <p>{registrations.length ? 'No registrations match these filters.' : 'No registrations have arrived yet.'}</p>
          </div>
        ) : (
          <div className="registration-table-wrap">
            <table className="registration-table">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Contact</th>
                  <th>Webinar / event</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {visibleRegistrations.map((registration, index) => {
                  const itemType = normalizeType(registration.event_type);
                  const status = registrationStatus(registration);
                  const attendeeName = registration.name || 'Guest';
                  return (
                    <tr key={registration.id || `${registration.email}-${index}`}>
                      <td>
                        <div className="registration-person">
                          <span>{attendeeName.slice(0, 2).toUpperCase()}</span>
                          <div><strong>{attendeeName}</strong><small>{registration.city || 'City not provided'}</small></div>
                        </div>
                      </td>
                      <td><strong>{registration.email || '—'}</strong><small>{registration.phone || 'No phone number'}</small></td>
                      <td><strong>{registration.event_title || 'Untitled event'}</strong><small>{formatDate(registration.event_date)}</small></td>
                      <td><span className={`registration-type is-${itemType === 'webinar' ? 'webinar' : 'event'}`}>{itemType === 'webinar' ? 'Webinar' : 'Event'}</span></td>
                      <td><span className={`registration-status is-${status.tone}`}>{status.label}</span></td>
                      <td>{formatDate(registration.registered_at, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
