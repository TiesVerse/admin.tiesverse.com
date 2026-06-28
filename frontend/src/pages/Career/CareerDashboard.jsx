import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { getCandidates, getPositions, updateCandidateStatus } from '../../apiClient';
import './CareerDashboard.css';

const DECISIONS = ['Under Review', 'Shortlisted', 'Selected', 'Rejected'];
const STATUSES = ['Pending Setup', 'Interview Scheduled', 'Interview Done', 'On Hold'];
const PAGE_SIZE = 8;
const PREFERRED_DEPARTMENTS = ['Tech', 'Content', 'Operations', 'Media'];

function initials(candidate) {
  return [candidate.first_name, candidate.last_name]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'TV';
}

function candidateName(candidate) {
  return [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Unnamed candidate';
}

const CareerDashboard = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [candidateResponse, positionResponse] = await Promise.all([getCandidates(), getPositions()]);
      if (candidateResponse?.error) {
        setError(candidateResponse.error);
        setCandidates([]);
      } else {
        setCandidates(Array.isArray(candidateResponse) ? candidateResponse : []);
      }
      setPositions(Array.isArray(positionResponse) ? positionResponse : []);
    } catch {
      setError('Failed to load candidates from the hosted ATS.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const departments = useMemo(() => {
    const available = Array.from(new Set(candidates.map((candidate) => candidate.department).filter(Boolean)));
    return ['All', ...PREFERRED_DEPARTMENTS.filter((item) => available.includes(item)), ...available.filter((item) => !PREFERRED_DEPARTMENTS.includes(item))];
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (filter !== 'All' && candidate.department !== filter) return false;
      if (!query) return true;
      return [
        candidateName(candidate),
        candidate.email,
        candidate.department,
        candidate.roles,
        candidate.city,
        candidate.interview_status,
        candidate.final_decision,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [candidates, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages);
  const visibleCandidates = filteredCandidates.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const firstVisible = filteredCandidates.length ? (activePage - 1) * PAGE_SIZE + 1 : 0;
  const lastVisible = Math.min(activePage * PAGE_SIZE, filteredCandidates.length);

  const openPositions = positions.filter((position) => position.is_open).length;
  const pendingReviews = candidates.filter((candidate) => (candidate.final_decision || 'Under Review') === 'Under Review').length;
  const selectedCandidates = candidates.filter((candidate) => ['Selected', 'Accepted'].includes(candidate.final_decision)).length;

  const handleFilter = (department) => {
    setFilter(department);
    setPage(1);
  };

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleDecision = async (id, field, value) => {
    setUpdating(id);
    const candidate = candidates.find((item) => String(item.id ?? item.row_index) === String(id));
    if (!candidate) {
      setUpdating(null);
      return;
    }

    const response = await updateCandidateStatus(id, {
      interview_status: field === 'interview_status' ? value : (candidate.interview_status || ''),
      interviewer: candidate.interviewer || '',
      rating: candidate.rating || 0,
      final_decision: field === 'final_decision' ? value : (candidate.final_decision || 'Under Review'),
    });

    if (response?.error) {
      setError(response.error);
    } else {
      setCandidates((current) => current.map((item) => (
        String(item.id ?? item.row_index) === String(id) ? { ...item, [field]: value } : item
      )));
    }
    setUpdating(null);
  };

  const metrics = [
    { label: 'Open Positions', value: openPositions, icon: BriefcaseBusiness, tone: 'orange', helper: `${positions.length} total` },
    { label: 'Total Applicants', value: candidates.length, icon: Users, tone: 'indigo', helper: 'Live ATS' },
    { label: 'Pending Review', value: pendingReviews, icon: Clock3, tone: 'purple', helper: 'Active queue' },
    { label: 'Selected', value: selectedCandidates, icon: CheckCircle2, tone: 'green', helper: 'Final decision' },
  ];

  return (
    <div className="career-dashboard-page">
      <header className="career-dashboard-header">
        <div>
          <span className="career-eyebrow">Talent operations</span>
          <h1>Career Portal</h1>
          <p>Applications from the live recruitment repository.</p>
        </div>
        <button type="button" onClick={fetchData} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'career-spin' : ''} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </header>

      <section className="career-metric-grid" aria-label="Career statistics">
        {metrics.map(({ label, value, icon: Icon, tone, helper }) => (
          <article className={`career-metric-card tone-${tone}`} key={label}>
            <div className="career-metric-topline">
              <span><Icon size={21} /></span>
              <small>{helper}</small>
            </div>
            <p>{label}</p>
            <strong>{loading ? '—' : value}</strong>
          </article>
        ))}
      </section>

      <section className="career-toolbar">
        <div className="career-filter-list" aria-label="Filter candidates by department">
          {departments.map((department) => (
            <button type="button" key={department} className={department === filter ? 'is-active' : ''} onClick={() => handleFilter(department)}>
              {department}
            </button>
          ))}
        </div>
        <label className="career-search">
          <Search size={17} />
          <input value={search} onChange={handleSearch} placeholder="Search candidates…" aria-label="Search candidates" />
        </label>
      </section>

      {error && <div className="career-error">{error}</div>}

      <section className="career-table-card">
        <div className="career-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Dept / Role</th>
                <th>City</th>
                <th>Status</th>
                <th>Decision</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="career-table-state">Loading candidates…</td></tr>
              ) : visibleCandidates.length === 0 ? (
                <tr><td colSpan="7" className="career-table-state">No matching applicants found.</td></tr>
              ) : visibleCandidates.map((candidate) => {
                const id = candidate.id ?? candidate.row_index;
                const decision = candidate.final_decision || 'Under Review';
                const decisionOptions = DECISIONS.includes(decision) ? DECISIONS : [decision, ...DECISIONS];
                return (
                  <tr key={id}>
                    <td>
                      <div className="career-candidate-name">
                        <span>{initials(candidate)}</span>
                        <strong>{candidateName(candidate)}</strong>
                      </div>
                    </td>
                    <td className="career-email">{candidate.email || '—'}</td>
                    <td>
                      <span className="career-department">{candidate.department || 'Unassigned'}</span>
                      <small>{candidate.roles || 'Role not specified'}</small>
                    </td>
                    <td>{candidate.city || '—'}</td>
                    <td>
                      <select
                        className="career-status-select"
                        value={candidate.interview_status || 'Pending Setup'}
                        disabled={updating === id}
                        onChange={(event) => handleDecision(id, 'interview_status', event.target.value)}
                      >
                        {STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        className={`career-decision-select decision-${decision.toLowerCase().replace(/\s+/g, '-')}`}
                        value={decision}
                        disabled={updating === id}
                        onChange={(event) => handleDecision(id, 'final_decision', event.target.value)}
                      >
                        {decisionOptions.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </td>
                    <td className="career-date">
                      {candidate.created_at || candidate.timestamp
                        ? new Date(candidate.created_at || candidate.timestamp).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="career-table-footer">
          <p>Showing {firstVisible} to {lastVisible} of {filteredCandidates.length} applications</p>
          <div>
            <button type="button" disabled={activePage === 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
            <span>{activePage} / {totalPages}</span>
            <button type="button" disabled={activePage === totalPages} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
          </div>
        </footer>
      </section>

      <button type="button" className="career-new-position" onClick={() => navigate('/career/positions')}>
        <Plus size={23} />
        <span>New Position</span>
      </button>
    </div>
  );
};

export default CareerDashboard;
