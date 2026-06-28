import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
    getPositions, createPosition, updatePosition, deletePosition,
    getOfferLetters, createOfferLetter, updateOfferLetter, deleteOfferLetter,
    getCandidates, updateCandidateStatus, getFormGates, updateFormGates,
    downloadFile, sendOffer
} from '../../apiClient';
import { Plus, Edit2, Trash2, X, Sparkles, Briefcase, FileText, Mail, ToggleRight, CheckCircle, ExternalLink, Search, Download, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './CareerPositions.css';
import './ApplicationTracker.css';
import './FormGates.css';

// ===== SHARED STYLES =====
const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff', fontSize: '0.875rem', fontFamily: 'inherit',
    transition: 'all 0.2s', outline: 'none', boxSizing: 'border-box',
};
const selectStyle = { ...inputStyle, cursor: 'pointer', appearance: 'auto' };

const FieldLabel = ({ children }) => (
    <label style={{
        display: 'block', fontSize: '0.6875rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.35)', marginBottom: '8px',
    }}>{children}</label>
);

const FormField = ({ label, name, value, onChange, placeholder, required, type = 'text', disabled }) => (
    <div>
        <FieldLabel>{label}</FieldLabel>
        <input type={type} name={name} value={value || ''} onChange={onChange}
            placeholder={placeholder} required={required} disabled={disabled}
            style={{ ...inputStyle, opacity: disabled ? 0.5 : 1 }}
            onFocus={e => { e.target.style.borderColor = 'color-mix(in srgb, var(--primary) 40%, transparent)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
        />
    </div>
);

const parseAssessmentAnswers = (rawAnswers) => {
    if (!rawAnswers) return [];

    if (Array.isArray(rawAnswers)) {
        return rawAnswers.map((item, index) => ({
            question: item?.question || item?.label || `Question ${index + 1}`,
            answer: item?.answer || item?.value || JSON.stringify(item),
        }));
    }

    if (typeof rawAnswers === 'object') {
        return Object.entries(rawAnswers).map(([question, answer]) => ({
            question,
            answer: typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2),
        }));
    }

    const text = String(rawAnswers).replace(/\r\n/g, '\n').trim();
    if (!text) return [];

    try {
        const parsed = JSON.parse(text);
        if (parsed !== text) return parseAssessmentAnswers(parsed);
    } catch {
        // Plain-text assessments are parsed below.
    }

    const tiles = [];
    let question = '';
    let answers = [];
    const pushTile = () => {
        if (!question && answers.length === 0) return;
        tiles.push({
            question: question || 'Assessment',
            answer: answers.join('\n').trim() || '—',
        });
    };

    text.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
        const isAnswer = /^->\s*/.test(line);
        const isQuestion = /^\[.*?\]\s*/.test(line) || (!isAnswer && line.endsWith('?'));
        if (isQuestion) {
            pushTile();
            question = line.replace(/^\[.*?\]\s*/, '').trim();
            answers = [];
        } else {
            if (!question) question = 'Assessment';
            answers.push(line.replace(/^->\s*/, ''));
        }
    });
    pushTile();
    return tiles;
};

const FORM_GATE_CATEGORIES = {
    Tech: ['tech_roles'],
    Content: ['content_editor', 'content_writer_upsc', 'upsc_strategist', 'graphic_designer_canva', 'uiux_designer'],
    Media: ['video_editor_reels_yt', 'social_media_manager_ig', 'youtube_manager'],
    Operations: ['hr', 'marketing_outreach', 'management_coordination', 'collab_outreach'],
};

const FORM_GATE_CATEGORY_HINTS = {
    Tech: 'All developer roles',
    Content: 'Editorial & research',
    Media: 'Video & social',
    Operations: 'HR & management',
};

const FORM_GATE_GROUPS = [
    { title: 'Content', keys: ['content_editor', 'content_writer_upsc', 'upsc_strategist'] },
    { title: 'Design', keys: ['graphic_designer_canva', 'uiux_designer'] },
    { title: 'Media', keys: ['video_editor_reels_yt', 'social_media_manager_ig', 'youtube_manager'] },
    { title: 'Operations', keys: ['hr', 'marketing_outreach', 'management_coordination', 'collab_outreach'] },
    { title: 'Tech', keys: ['tech_roles'] },
];

const FORM_GATE_LABELS = {
    Tech: 'Tech',
    Content: 'Content',
    Media: 'Media',
    Operations: 'Operations',
    content_editor: 'Content Editor',
    content_writer_upsc: 'Content Writer (UPSC)',
    upsc_strategist: 'UPSC Content Researcher and Strategist',
    graphic_designer_canva: 'Graphic Designer (Canva)',
    uiux_designer: 'UI/UX Designer',
    video_editor_reels_yt: 'Video Editor (Reels + YouTube)',
    social_media_manager_ig: 'Social Media Manager (Instagram)',
    youtube_manager: 'YouTube Manager',
    hr: 'Human Resource (HR)',
    marketing_outreach: 'Marketing & Outreach Specialist',
    management_coordination: 'Management / Team Co-ordination',
    collab_outreach: 'Collaboration & Outreach Manager',
    tech_roles: 'Tech Roles',
};

const TAB_CONFIG = {
    positions: {
        title: 'Positions', subtitle: 'Manage job postings.', icon: <Briefcase size={20} />, itemLabel: 'Position',
        fetchFn: getPositions, createFn: createPosition, updateFn: updatePosition, deleteFn: deletePosition,
        defaultForm: { is_open: true },
    },
    applications: {
        title: 'Application Tracker', subtitle: 'Review applications and manage every hiring decision in one place.', icon: <FileText size={20} />, itemLabel: 'Application',
        fetchFn: getCandidates, createFn: null, updateFn: updateCandidateStatus, deleteFn: null,
        defaultForm: {},
    },
    offers: {
        title: 'Offer Letters', subtitle: 'Manage and generate offer letters.', icon: <Mail size={20} />, itemLabel: 'Offer Letter',
        fetchFn: getOfferLetters, createFn: createOfferLetter, updateFn: updateOfferLetter, deleteFn: deleteOfferLetter,
        defaultForm: {},
    },
    form_gates: {
        title: 'Form Gates', subtitle: 'Manage application form visibility.', icon: <ToggleRight size={20} />, itemLabel: 'Form Gates',
        fetchFn: getFormGates, createFn: null, updateFn: updateFormGates, deleteFn: null,
        defaultForm: {},
    },
};

const CareerAdmin = ({ tab = 'positions' }) => {
    const { user } = useContext(AuthContext);
    const config = TAB_CONFIG[tab];

    const [items, setItems] = useState([]);
    const [enrollmentsList, setEnrollmentsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, title: '' });
    const [notification, setNotification] = useState(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    // Offer letter sending
    const [sendingOffer, setSendingOffer] = useState(null);
    const [offerSent, setOfferSent] = useState({});

    // Modals
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfConfig, setPdfConfig] = useState({ department: 'All', status: 'All' });
    const [detailsModal, setDetailsModal] = useState({ open: false, candidate: null });
    const [detailsTab, setDetailsTab] = useState('summary');
    const [applicationDrafts, setApplicationDrafts] = useState({});
    const [savingApplication, setSavingApplication] = useState(null);
    const [gateDraft, setGateDraft] = useState({});
    const [savingGates, setSavingGates] = useState(false);

    const showNotice = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleSendOffer = async (candidate) => {
        setSendingOffer(candidate.id);
        try {
            const doc = new jsPDF();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('Offer Letter', 105, 30, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text(`Dear ${candidate.first_name} ${candidate.last_name},`, 20, 55);
            doc.text('We are pleased to offer you a position at Tiesverse. Please find the details below:', 20, 70, { maxWidth: 170 });
            const offerTable = autoTable(doc, {
                startY: 90,
                head: [['Field', 'Details']],
                body: [
                    ['Role', candidate.roles || 'N/A'],
                    ['Department', candidate.department || 'N/A'],
                    ['Status', 'Selected'],
                ],
                theme: 'grid',
                headStyles: { fillColor: [254, 122, 0] },
                styles: { fontSize: 10 },
            });
            const finalY = (offerTable?.finalY ?? doc.lastAutoTable?.finalY ?? 110) + 20;
            doc.text('Congratulations on being selected! Our team will be in touch shortly with next steps.', 20, finalY, { maxWidth: 170 });
            doc.text('Regards,\nTiesverse HR Team', 20, finalY + 20);

            const pdfBase64 = doc.output('datauristring').split(',')[1];
            await sendOffer({
                email: candidate.email,
                name: `${candidate.first_name} ${candidate.last_name}`,
                pdf_base64: pdfBase64,
            });
            setOfferSent(prev => ({ ...prev, [candidate.id]: true }));
            showNotice(`Offer letter sent to ${candidate.email}!`);
        } catch (err) {
            showNotice('Failed to send offer letter: ' + (err?.message || 'Unknown error'), 'error');
        }
        setSendingOffer(null);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (tab === 'offers') {
                // Show selected applications in the offer-letter roster.
                const cands = await getCandidates();
                const selected = (cands?.data || cands || []).filter(c => c.final_decision === 'Selected' || c.final_decision === 'Accepted');
                setItems(selected);
            } else {
                const data = await config.fetchFn();
                if (tab === 'form_gates') {
                    // getFormGates returns { status, gates: {...} } — iterate the gates map.
                    const gates = data?.gates || {};
                    const gatesArray = Object.entries(gates).map(([key, value]) => ({ id: key, name: key, is_open: value }));
                    setItems(gatesArray);
                    setGateDraft(gates);
                } else if (tab === 'applications') {
                    setItems(data.data || data || []);
                } else {
                    setItems(data || []);
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchData();
            setFormModalOpen(false);
            setEditingId(null);
            setFormData({});
            setSearchQuery('');
            setFilterDepartment('All');
            setFilterStatus('All');
            setApplicationDrafts({});
        }
    }, [tab, user]);

    const filteredItems = items.filter(item => {
        if (tab !== 'applications') return true;

        const s = searchQuery.toLowerCase();
        const name = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
        const email = (item.email || '').toLowerCase();
        const role = (item.roles || '').toLowerCase();
        const dept = item.department || 'Unknown';
        const stat = item.final_decision || 'Under Review';

        const matchSearch = name.includes(s) || email.includes(s) || role.includes(s);
        const matchDept = filterDepartment === 'All' || dept === filterDepartment;
        const matchStatus = filterStatus === 'All' || stat === filterStatus;

        return matchSearch && matchDept && matchStatus;
    });

    const handleGeneratePDF = () => {
        const doc = new jsPDF('landscape');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Tiesverse Admin Report', 14, 22);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text('Source: Career applications', 14, 36);
        doc.text(`Filters applied -> Department: ${pdfConfig.department} | Status: ${pdfConfig.status}`, 14, 42);

        let exportItems = items.filter(item => {
            let dept = item.department;
            let stat = item.final_decision;
            const matchDept = pdfConfig.department === 'All' || dept === pdfConfig.department;
            const matchStatus = pdfConfig.status === 'All' || stat === pdfConfig.status;
            return matchDept && matchStatus;
        });

        const tableColumns = ['Name', 'Email', 'Role', 'Dept', 'Interviewer', 'Rating', 'Decision'];
        const tableRows = exportItems.map(i => [
            `${i.first_name || ''} ${i.last_name || ''}`, i.email || '-', i.roles || '-', i.department || '-',
            i.interviewer || '-', i.rating || '-', i.final_decision || 'Under Review'
        ]);

        autoTable(doc, {
            startY: 50,
            head: [tableColumns],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [254, 122, 0] },
            styles: { fontSize: 9 }
        });

        doc.save(`tiesverse_${tab}_report.pdf`);
        setPdfModalOpen(false);
        showNotice('PDF generated successfully!');
    };

    const openCreateModal = () => {
        setFormData({ ...config.defaultForm });
        setEditingId(null);
        setFormModalOpen(true);
    };

    const openEditModal = (item) => {
        if (tab === 'applications') {
            setEditingId(item.row_index || item.id);
        } else {
            setEditingId(item.id);
        }
        setFormData({ ...item });
        setFormModalOpen(true);
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        setFormData({});
        setEditingId(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFormGateToggle = (key, isOpen) => {
        setGateDraft((current) => {
            const next = { ...current, [key]: isOpen };
            if (FORM_GATE_CATEGORIES[key]) {
                FORM_GATE_CATEGORIES[key].forEach((positionKey) => {
                    next[positionKey] = isOpen;
                });
            }
            if (!FORM_GATE_CATEGORIES[key] && isOpen) {
                const category = Object.entries(FORM_GATE_CATEGORIES)
                    .find(([, positionKeys]) => positionKeys.includes(key))?.[0];
                if (category) next[category] = true;
            }
            return next;
        });
    };

    const setAllFormGates = (isOpen) => {
        setGateDraft((current) => Object.keys(current).reduce((next, key) => {
            next[key] = isOpen;
            return next;
        }, {}));
    };

    const saveFormGates = async () => {
        setSavingGates(true);
        try {
            const response = await updateFormGates({ gates: gateDraft });
            if (response?.error || response?.status === 'error') {
                throw new Error(response?.error || response?.message || 'Update failed');
            }
            showNotice('Application form settings saved.');
            await fetchData();
        } catch (error) {
            showNotice(`Failed to save form settings: ${error?.message || 'Unknown error'}`, 'error');
        } finally {
            setSavingGates(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            if (editingId) {
                const res = await config.updateFn(editingId, formData);
                if (res?.error) showNotice('Error: ' + res.error, 'error');
                else { showNotice('Updated successfully!'); closeFormModal(); fetchData(); }
            } else {
                const res = await config.createFn(formData);
                if (res?.error) showNotice('Error: ' + res.error, 'error');
                else { showNotice('Created successfully!'); closeFormModal(); fetchData(); }
            }
        } catch (err) {
            showNotice('Error: ' + err.message, 'error');
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        const { id } = deleteModal;
        setLoading(true);
        const res = await config.deleteFn(id);
        if (res?.error) showNotice('Error: ' + res.error, 'error');
        else { showNotice('Removed successfully.'); fetchData(); }
        setLoading(false);
        setDeleteModal({ open: false, id: null, title: '' });
    };

    const renderFormFields = () => {
        if (tab === 'positions') return (
            <>
                <FormField label="Job Title" name="title" value={formData.title} onChange={handleInputChange} required />
                <FormField label="Department" name="department" value={formData.department} onChange={handleInputChange} required />
                <div><FieldLabel>Description</FieldLabel><textarea name="description" value={formData.description || ''} onChange={handleInputChange} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} required /></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                    <input type="checkbox" name="is_open" checked={formData.is_open !== false} onChange={handleInputChange} /> Position Open
                </label>
            </>
        );

        if (tab === 'offers') return (
            <>
                <div>
                    <FieldLabel>Applicant (Enrollment)</FieldLabel>
                    <select name="applicant" value={formData.applicant || ''} onChange={handleInputChange} style={selectStyle} required>
                        <option value="">Select Applicant...</option>
                        {enrollmentsList.map(e => (
                            <option key={e.id} value={e.id}>{e.applicant_name} - {e.position?.title || 'Unknown Position'}</option>
                        ))}
                    </select>
                </div>
                <FormField label="Salary" name="salary" value={formData.salary} onChange={handleInputChange} required type="number" step="0.01" />
                <FormField label="Joining Date" name="joining_date" value={formData.joining_date} onChange={handleInputChange} required type="date" />
            </>
        );

        if (tab === 'applications') return (
            <>
                <FormField label="First Name" name="first_name" value={formData.first_name} disabled />
                <FormField label="Last Name" name="last_name" value={formData.last_name} disabled />
                <FormField label="Department" name="department" value={formData.department} disabled />
                <FormField label="Roles" name="roles" value={formData.roles} disabled />
                
                <div>
                    <FieldLabel>Interview Status</FieldLabel>
                    <select name="interview_status" value={formData.interview_status || 'Pending Setup'} onChange={handleInputChange} style={selectStyle}>
                        <option value="Pending Setup">Pending Setup</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Interviewed">Interviewed</option>
                        <option value="Offer Extended">Offer Extended</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
                <FormField label="Interviewer Name" name="interviewer" value={formData.interviewer} onChange={handleInputChange} />
                <FormField label="Rating (0-10)" name="rating" value={formData.rating} onChange={handleInputChange} type="number" min="0" max="10" />
                <div>
                    <FieldLabel>Final Decision</FieldLabel>
                    <select name="final_decision" value={formData.final_decision || 'Under Review'} onChange={handleInputChange} style={selectStyle}>
                        <option value="Under Review">Under Review</option>
                        <option value="Selected">Selected</option>
                        <option value="Not Selected">Not Selected</option>
                        <option value="Waitlisted">Waitlisted</option>
                    </select>
                </div>
            </>
        );

        return null;
    };

    const openApplicationDetails = (candidate) => {
        setDetailsTab('summary');
        setDetailsModal({ open: true, candidate });
    };

    const closeApplicationDetails = () => {
        setDetailsModal({ open: false, candidate: null });
        setDetailsTab('summary');
    };

    const getApplicationId = (application) => application.id ?? application.row_index;

    const getApplicationDraft = (application) => {
        const id = getApplicationId(application);
        return applicationDrafts[id] || {
            interview_status: application.interview_status || 'Pending Setup',
            interviewer: application.interviewer || '',
            rating: Number(application.rating || 0),
            final_decision: application.final_decision || 'Under Review',
        };
    };

    const updateApplicationDraft = (application, field, value) => {
        const id = getApplicationId(application);
        setApplicationDrafts((current) => ({
            ...current,
            [id]: {
                interview_status: application.interview_status || 'Pending Setup',
                interviewer: application.interviewer || '',
                rating: Number(application.rating || 0),
                final_decision: application.final_decision || 'Under Review',
                ...(current[id] || {}),
                [field]: value,
            },
        }));
    };

    const resetFormGates = () => {
        setGateDraft(items.reduce((next, item) => {
            next[item.name] = item.is_open;
            return next;
        }, {}));
        showNotice('Unsaved form changes were discarded.');
    };

    const saveApplicationEvaluation = async (application) => {
        const id = getApplicationId(application);
        const draft = getApplicationDraft(application);
        setSavingApplication(id);
        try {
            const result = await updateCandidateStatus(id, draft);
            if (result?.error) throw new Error(result.error);
            setItems((current) => current.map((item) => (
                String(getApplicationId(item)) === String(id) ? { ...item, ...draft } : item
            )));
            setApplicationDrafts((current) => {
                const next = { ...current };
                delete next[id];
                return next;
            });
            showNotice(`Evaluation saved for ${application.first_name || 'applicant'}.`);
        } catch (error) {
            showNotice(`Could not save evaluation: ${error?.message || 'Unknown error'}`, 'error');
        } finally {
            setSavingApplication(null);
        }
    };

    const renderFormGateCard = (key, isCategory = false) => {
        const isOpen = gateDraft[key] !== false;
        return (
            <article className={`form-gate-card ${isCategory ? 'is-category' : 'is-position'} ${isOpen ? 'is-open' : 'is-closed'}`} key={key}>
                <div>
                    <h3>{FORM_GATE_LABELS[key] || key}</h3>
                    <p>{isCategory ? FORM_GATE_CATEGORY_HINTS[key] : `Key: ${key}`}</p>
                </div>
                <div className="form-gate-card-actions">
                    <span className={`form-gate-badge ${isOpen ? 'is-open' : 'is-closed'}`}>{isOpen ? 'Open' : 'Closed'}</span>
                    <label className="form-gate-switch">
                        <input
                            type="checkbox"
                            checked={isOpen}
                            onChange={(event) => handleFormGateToggle(key, event.target.checked)}
                            aria-label={`${isOpen ? 'Close' : 'Open'} ${FORM_GATE_LABELS[key] || key} applications`}
                        />
                        <span />
                    </label>
                </div>
            </article>
        );
    };

    const renderFormGateSettings = () => (
        <section className="form-gate-settings">
            <div className="form-gate-callout">
                Toggle which forms are <strong>Open</strong> or <strong>Closed</strong>. Changes go live after you select <strong>Save changes</strong>.
            </div>

            <div className="form-gate-category-panel">
                <header className="form-gate-panel-heading">
                    <div>
                        <h2>Category Access Controls</h2>
                        <p>Override visibility settings for entire departments.</p>
                    </div>
                    <div>
                        <button type="button" onClick={() => setAllFormGates(false)}>Close all</button>
                        <button type="button" className="is-primary" onClick={() => setAllFormGates(true)}>Open all</button>
                    </div>
                </header>

                <div className="form-gate-grid is-categories">
                    {Object.keys(FORM_GATE_CATEGORIES).map((key) => renderFormGateCard(key, true))}
                </div>
            </div>

            <div className="form-gate-detailed">
                <header className="form-gate-detailed-heading">
                    <h2>Detailed Position Toggles</h2>
                    <span>Global list ({Object.keys(gateDraft).length} forms)</span>
                </header>

                <div className="form-gate-position-groups">
                    {FORM_GATE_GROUPS.map((group) => (
                        <section className="form-gate-group" key={group.title}>
                            <div className="form-gate-group-heading">
                                <h3>{group.title === 'Tech' ? 'Technology' : group.title}</h3>
                                <span />
                            </div>
                            <div className="form-gate-grid">
                                {group.keys.map((key) => renderFormGateCard(key))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            <footer className="form-gate-footer">
                <div className="form-gate-open-count">
                    <i />
                    <span><strong>{Object.values(gateDraft).filter((value) => value !== false).length} of {Object.keys(gateDraft).length}</strong> forms open</span>
                </div>
                <div>
                    <button type="button" className="is-secondary" onClick={resetFormGates} disabled={savingGates}>Cancel changes</button>
                    <button type="button" onClick={saveFormGates} disabled={savingGates}>
                        {savingGates ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </footer>
        </section>
    );

    const renderItemCard = (item) => {
        const title = item.title || item.applicant_name || (item.first_name ? `${item.first_name} ${item.last_name}` : '') || `Offer #${item.id}`;
        const subtitle = item.department || item.status || item.interview_status || `Salary: $${item.salary}`;

        if (tab === 'positions') {
            return (
                <article className="career-position-card" key={item.id}>
                    <div className="career-position-topline">
                        <span className={`career-position-department dept-${String(item.department || 'general').toLowerCase().replace(/\s+/g, '-')}`}>
                            {item.department || 'General'}
                        </span>
                        <span className={`career-position-status ${item.is_open === false ? 'is-closed' : 'is-active'}`}>
                            <i /> {item.is_open === false ? 'Closed' : 'Active'}
                        </span>
                    </div>
                    <h2>{title}</h2>
                    <p>{item.description || 'No role description has been added yet.'}</p>
                    <footer>
                        <span><Briefcase size={15} /> {item.is_open === false ? 'Not accepting applications' : 'Accepting applications'}</span>
                        <div>
                            <button type="button" onClick={() => openEditModal(item)} aria-label={`Edit ${title}`}><Edit2 size={17} /></button>
                            <button type="button" className="is-danger" onClick={() => setDeleteModal({ open: true, id: item.id, title })} aria-label={`Delete ${title}`}><Trash2 size={17} /></button>
                        </div>
                    </footer>
                </article>
            );
        }

        if (tab === 'applications') {
            const id = getApplicationId(item);
            const draft = getApplicationDraft(item);
            const appliedDate = item.timestamp || item.created_at;
            const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unnamed applicant';
            const portfolioUrl = item.portfolio_link || item.portfolio;
            const rating = Math.max(0, Math.min(5, Number(draft.rating || 0)));

            return (
                <article className="application-card" key={id}>
                    <section className="application-card-info">
                        <div className="application-card-heading">
                            <div className="application-avatar">{fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                            <div>
                                <h2>{fullName}</h2>
                                <time>Applied on {appliedDate ? new Date(appliedDate).toLocaleDateString('en-IN') : 'an unavailable date'}</time>
                            </div>
                        </div>
                        <div className="application-tags">
                            <span className="application-role">{item.roles || 'Role not specified'}</span>
                            <span className="application-department">{item.department || 'General'}</span>
                        </div>
                        <dl className="application-contact">
                            <div><dt>Email</dt><dd>{item.email || 'Not provided'}</dd></div>
                            <div><dt>City</dt><dd>{item.city || 'Not provided'}</dd></div>
                            <div><dt>Phone</dt><dd>{item.phone || 'Not provided'}</dd></div>
                        </dl>
                        <div className="application-links">
                            {item.resume_link && <button type="button" onClick={() => downloadFile(item.resume_link, `resume_${item.first_name || 'applicant'}.pdf`)}>Resume <Download size={13} /></button>}
                            {item.linkedin && <a href={item.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={12} /></a>}
                            {portfolioUrl && <a href={portfolioUrl} target="_blank" rel="noreferrer">Portfolio <ExternalLink size={12} /></a>}
                        </div>
                        <button type="button" className="application-details-button" onClick={() => openApplicationDetails(item)}>
                            <Eye size={15} /> View application details
                        </button>
                    </section>

                    <section className="application-card-evaluation">
                        <label>
                            <span>Interview status</span>
                            <select value={draft.interview_status} onChange={(event) => updateApplicationDraft(item, 'interview_status', event.target.value)}>
                                <option value="Pending Setup">Pending Setup</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Interview Scheduled">Interview Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Interviewed">Interviewed</option>
                            </select>
                        </label>
                        <label>
                            <span>Interviewer</span>
                            <input value={draft.interviewer} onChange={(event) => updateApplicationDraft(item, 'interviewer', event.target.value)} placeholder="Assign interviewer" />
                        </label>
                        <fieldset>
                            <legend>Rating</legend>
                            <div className="application-stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button type="button" key={star} className={star <= rating ? 'is-active' : ''} onClick={() => updateApplicationDraft(item, 'rating', star)} aria-label={`Rate ${star} out of 5`}>★</button>
                                ))}
                            </div>
                        </fieldset>
                    </section>

                    <section className="application-card-decision">
                        <label>
                            <span>Final decision</span>
                            <select value={draft.final_decision} onChange={(event) => updateApplicationDraft(item, 'final_decision', event.target.value)}>
                                <option value="Under Review">Under Review</option>
                                <option value="Selected">Selected</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Not Selected">Not Selected</option>
                                <option value="Waitlisted">Waitlisted</option>
                            </select>
                        </label>
                        <div className={`application-decision-badge decision-${draft.final_decision.toLowerCase().replace(/\s+/g, '-')}`}>
                            <span /> {draft.final_decision}
                        </div>
                        <button type="button" className="application-save-button" disabled={savingApplication === id} onClick={() => saveApplicationEvaluation(item)}>
                            {savingApplication === id ? 'Saving…' : 'Save Evaluation'}
                        </button>
                    </section>
                </article>
            );
        }

        return (
            <div key={item.id || item.row_index} style={{
                background: 'rgba(20,20,20,0.6)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px',
                padding: '20px', display: 'flex', flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: '5px', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)', display: 'inline-block', marginBottom: '10px' }}>
                        {subtitle}
                    </span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h3>
                    
                    {tab === 'positions' && (
                        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.3)', marginTop: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                    )}
                    
                    {tab === 'applications' && (
                        <div style={{ marginTop: '12px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                            <p style={{ margin: '2px 0' }}><strong>Role:</strong> {item.roles}</p>
                            <p style={{ margin: '2px 0' }}><strong>Email:</strong> {item.email}</p>
                            {item.resume_link && (
                                <button type="button" onClick={() => downloadFile(item.resume_link, `resume_${item.first_name}_${item.last_name}.pdf`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3B82F6', marginTop: '8px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
                                    <ExternalLink size={14} /> View Resume
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                        {tab === 'applications' ? `Rating: ${item.rating || 0}/5` : (item.is_open === false ? 'Closed' : '')}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {tab === 'applications' && (
                            <button onClick={() => openApplicationDetails(item)} title="Review Application"
                                style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
                            ><Eye size={14} /></button>
                        )}
                        {config.updateFn && (
                            <button onClick={() => openEditModal(item)} title="Edit"
                                style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
                            ><Edit2 size={14} /></button>
                        )}
                        {config.deleteFn && (
                            <button onClick={() => setDeleteModal({ open: true, id: item.id, title: title })} title="Delete"
                                style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
                            ><Trash2 size={14} /></button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const detailCandidate = detailsModal.candidate;
    const detailFullName = detailCandidate
        ? `${detailCandidate.first_name || ''} ${detailCandidate.last_name || ''}`.trim() || 'Unnamed applicant'
        : '';
    const detailAppliedAt = detailCandidate?.timestamp || detailCandidate?.created_at;
    const detailPortfolio = detailCandidate?.portfolio_link || detailCandidate?.portfolio;
    const detailAssessmentTiles = parseAssessmentAnswers(detailCandidate?.answers);

    return (
        <div className={`career-admin-page ${tab === 'positions' ? 'career-positions-page' : ''} ${tab === 'applications' ? 'career-applications-page' : ''}`}>
            <div className="career-admin-header">
                <div>
                    <span className="career-admin-eyebrow">{tab === 'positions' ? 'Talent operations' : 'Career management'}</span>
                    <h1>{config.title}</h1>
                    <p>{tab === 'positions'
                        ? 'Manage and track open job postings across all departments. Monitor status and update role requirements in real time.'
                        : config.subtitle}</p>
                </div>
                {config.createFn && (
                    <button className="career-admin-create" onClick={openCreateModal}>
                        <Plus size={18} /> Add New {config.itemLabel}
                    </button>
                )}
            </div>

            {notification && (
                <div style={{
                    marginBottom: '20px', padding: '14px 20px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600,
                    background: notification.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${notification.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    color: notification.type === 'error' ? '#EF4444' : '#10B981',
                }}>
                    {notification.msg}
                </div>
            )}

            {loading && items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.1em' }}>LOADING...</div>
                </div>
            ) : (
                <>
                    {tab === 'applications' && (
                        <div className="application-toolbar">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1 }}>
                                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                                    <Search size={16} className="application-search-icon" />
                                    <input className="application-filter-control application-search" type="text" placeholder="Search name, email, or role..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                </div>
                                <select className="application-filter-control" value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}>
                                    <option value="All">All Departments</option>
                                    <option value="Tech">Tech</option>
                                    <option value="Content">Content</option>
                                    <option value="Media">Media</option>
                                    <option value="Operations">Operations</option>
                                </select>
                                <select className="application-filter-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                    <option value="All">All Decisions</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Selected">Selected</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Not Selected">Not Selected</option>
                                    <option value="Waitlisted">Waitlisted</option>
                                </select>
                            </div>
                            <button className="application-export-button" onClick={() => setPdfModalOpen(true)}>
                                <Download size={16} /> Export PDF
                            </button>
                        </div>
                    )}
                    
                    {filteredItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 0', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {config.icon && React.cloneElement(config.icon, { size: 40, style: { color: 'rgba(255,255,255,0.15)', marginBottom: '12px' } })}
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', fontWeight: 600 }}>No {config.itemLabel.toLowerCase()}s found.</p>
                        </div>
                    ) : tab === 'form_gates' ? (
                        renderFormGateSettings()
                    ) : tab === 'offers' ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                        {['Name', 'Email', 'Department', 'Role', 'Action'].map(h => (
                                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.first_name} {c.last_name}</td>
                                            <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)' }}>{c.email}</td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 6 }}>{c.department}</span>
                                            </td>
                                            <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>{c.roles}</td>
                                            <td style={{ padding: '12px 14px' }}>
                                                {offerSent[c.id] ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10B981', fontSize: '0.8125rem', fontWeight: 700 }}>
                                                        <CheckCircle size={14} /> Sent
                                                    </span>
                                                ) : (
                                                    <button
                                                        disabled={sendingOffer === c.id}
                                                        onClick={() => handleSendOffer(c)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 800, cursor: sendingOffer === c.id ? 'wait' : 'pointer', opacity: sendingOffer === c.id ? 0.7 : 1 }}
                                                    >
                                                        <Mail size={13} /> {sendingOffer === c.id ? 'Sending…' : 'Send Offer'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={`career-admin-grid ${tab === 'form_gates' ? 'is-wide' : ''} ${tab === 'applications' ? 'is-applications' : ''}`}>
                            {filteredItems.map(item => renderItemCard(item))}
                            {tab === 'positions' && (
                                <button type="button" className="career-position-new-card" onClick={openCreateModal}>
                                    <Plus size={33} />
                                    <strong>Create New Position</strong>
                                    <span>Add another role to the Career portal.</span>
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {formModalOpen && (
                <div className="career-admin-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div className="career-admin-modal" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sparkles size={20} style={{ color: 'var(--primary)' }} />
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                                    {editingId ? `Edit ${config.itemLabel}` : `New ${config.itemLabel}`}
                                </h2>
                            </div>
                            <button onClick={closeFormModal} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {renderFormFields()}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="button" onClick={closeFormModal} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={loading} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer' }}>{loading ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteModal.open && (
                <div className="career-admin-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div className="career-admin-modal" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '32px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <Trash2 size={40} style={{ color: '#EF4444', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Delete {config.itemLabel}?</h3>
                            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>Remove "{deleteModal.title}"? This cannot be undone.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setDeleteModal({ open: false, id: null, title: '' })} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleDelete} disabled={loading} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#EF4444', color: '#fff', border: 'none', fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {pdfModalOpen && (
                <div className="app-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div className="app-modal" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', margin: 0 }}>Export Data to PDF</h2>
                            <button onClick={() => setPdfModalOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <FieldLabel>Filter by Department</FieldLabel>
                                <select value={pdfConfig.department} onChange={e => setPdfConfig(p => ({...p, department: e.target.value}))} style={selectStyle}>
                                    <option value="All">All Departments</option>
                                    <option value="Tech">Tech</option>
                                    <option value="Content">Content</option>
                                    <option value="Media">Media</option>
                                    <option value="Operations">Operations</option>
                                </select>
                            </div>
                            <div>
                                <FieldLabel>Filter by Decision</FieldLabel>
                                <select value={pdfConfig.status} onChange={e => setPdfConfig(p => ({...p, status: e.target.value}))} style={selectStyle}>
                                    <option value="All">All Applications</option>
                                    {tab === 'applications' ? (
                                        <>
                                            <option value="Under Review">Under Review</option>
                                            <option value="Selected">Selected</option>
                                            <option value="Rejected">Rejected</option>
                                            <option value="Not Selected">Not Selected</option>
                                            <option value="Waitlisted">Waitlisted</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Pending">Pending</option>
                                            <option value="Reviewed">Reviewed</option>
                                            <option value="Selected">Selected</option>
                                            <option value="Rejected">Rejected</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setPdfModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleGeneratePDF} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: '#000', fontWeight: 800, cursor: 'pointer' }}>Generate PDF</button>
                        </div>
                    </div>
                </div>
            )}

            {detailsModal.open && detailsModal.candidate && (
                <div className="application-detail-overlay" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) closeApplicationDetails();
                }}>
                    <div className="application-detail-modal" role="dialog" aria-modal="true" aria-labelledby="application-detail-title">
                        <header className="application-detail-topbar">
                            <strong>Application Details</strong>
                            <button type="button" onClick={closeApplicationDetails} aria-label="Close application details"><X size={20} /></button>
                        </header>

                        <div className="application-detail-body">
                            <div className="application-detail-hero">
                                <div className="application-detail-identity">
                                    <div className="application-detail-avatar">
                                        {detailFullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 id="application-detail-title">{detailFullName}</h2>
                                        <p>{detailCandidate.roles || 'Role not specified'}{detailCandidate.department ? ` · ${detailCandidate.department}` : ''}</p>
                                    </div>
                                </div>
                                <div className="application-detail-pills">
                                    {detailCandidate.department && <span>{detailCandidate.department}</span>}
                                    <span className={`decision-${String(detailCandidate.final_decision || 'Under Review').toLowerCase().replace(/\s+/g, '-')}`}>
                                        {detailCandidate.final_decision || 'Under Review'}
                                    </span>
                                </div>
                            </div>

                            <div className="application-detail-grid">
                                <div className="application-detail-tile">
                                    <span>Applied</span>
                                    <strong>{detailAppliedAt ? new Date(detailAppliedAt).toLocaleString('en-IN') : '—'}</strong>
                                </div>
                                <div className="application-detail-tile">
                                    <span>City</span>
                                    <strong>{detailCandidate.city || '—'}</strong>
                                </div>
                                <div className="application-detail-tile">
                                    <span>Email</span>
                                    <strong>{detailCandidate.email ? <a href={`mailto:${detailCandidate.email}`}>{detailCandidate.email}</a> : '—'}</strong>
                                </div>
                                <div className="application-detail-tile">
                                    <span>Phone</span>
                                    <strong>{detailCandidate.phone || '—'}</strong>
                                </div>
                                <div className="application-detail-tile is-wide">
                                    <span>Links</span>
                                    <strong className="application-detail-links">
                                        {detailCandidate.resume_link && <button type="button" onClick={() => downloadFile(detailCandidate.resume_link, `resume_${detailCandidate.first_name || 'applicant'}.pdf`)}>Resume</button>}
                                        {detailCandidate.linkedin && <a href={detailCandidate.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={12} /></a>}
                                        {detailPortfolio && <a href={detailPortfolio} target="_blank" rel="noreferrer">Portfolio <ExternalLink size={12} /></a>}
                                        {!detailCandidate.resume_link && !detailCandidate.linkedin && !detailPortfolio && '—'}
                                    </strong>
                                </div>
                            </div>

                            <div className="application-detail-tabs" role="tablist" aria-label="Application detail sections">
                                <button type="button" role="tab" aria-selected={detailsTab === 'summary'} className={detailsTab === 'summary' ? 'is-active' : ''} onClick={() => setDetailsTab('summary')}>Summary</button>
                                <button type="button" role="tab" aria-selected={detailsTab === 'assessment'} className={detailsTab === 'assessment' ? 'is-active' : ''} onClick={() => setDetailsTab('assessment')}>Assessment</button>
                            </div>

                            {detailsTab === 'summary' ? (
                                <section className="application-detail-panel" role="tabpanel">
                                    <div className="application-detail-tile is-wide">
                                        <span>Why join Tiesverse?</span>
                                        <p>{detailCandidate.why_join || 'No summary was provided.'}</p>
                                    </div>
                                </section>
                            ) : (
                                <section className="application-detail-panel application-assessment-list" role="tabpanel">
                                    {detailAssessmentTiles.length ? detailAssessmentTiles.map((tile, index) => (
                                        <div className="application-detail-tile is-wide" key={`${tile.question}-${index}`}>
                                            <span className="application-assessment-question">{tile.question}</span>
                                            <p>{tile.answer}</p>
                                        </div>
                                    )) : (
                                        <div className="application-detail-tile is-wide">
                                            <span>Assessment</span>
                                            <p>No assessment data was provided.</p>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        <footer className="application-detail-footer">
                            <span>Rating: {detailCandidate.rating || 0}/5</span>
                            {detailCandidate.resume_link && (
                                <button type="button" onClick={() => downloadFile(detailCandidate.resume_link, `resume_${detailCandidate.first_name || 'applicant'}.pdf`)}>
                                    <Download size={16} /> Download Resume
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CareerAdmin;
