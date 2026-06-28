import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Cloud, FileText, LoaderCircle, Plus, Trash2, Upload } from 'lucide-react';
import {
  CERTIFICATE_BACKEND,
  deleteCertificateTemplate,
  listCertificateTemplates,
  uploadCertificateTemplate,
} from './certificateApi';
import './Certificates.css';

const CertificateTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    listCertificateTemplates()
      .then(setTemplates)
      .catch((caught) => setError(caught?.message || 'Could not load templates.'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Choose a PDF exported from Canva or another design tool.');
      return;
    }
    setUploading(true);
    setProgress(3);
    setError('');
    try {
      const template = await uploadCertificateTemplate(file, setProgress);
      setProgress(100);
      navigate(`/certificates/templates/${template.id}/editor`);
    } catch (caught) {
      setError(caught?.message || 'Template upload failed.');
      setProgress(0);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete "${template.name}" and its generated files?`)) return;
    setDeleting(template.id);
    setError('');
    try {
      await deleteCertificateTemplate(template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch (caught) {
      setError(caught?.message || 'Could not delete template.');
    } finally {
      setDeleting('');
    }
  };

  return (
    <section className="certificate-page">
      <header className="certificate-page-header">
        <div>
          <span className="certificate-eyebrow">Document automation</span>
          <h1>Certificate Generator</h1>
          <p>Upload designed PDFs, position reusable fields, and generate personalized certificates at scale.</p>
        </div>
        <span className="certificate-service-badge"><Cloud size={14} /> Connected to Render</span>
      </header>

      <button
        type="button"
        className={`certificate-upload-zone ${uploading ? 'is-busy' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleUpload(event.dataTransfer.files?.[0]);
        }}
        disabled={uploading}
      >
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => handleUpload(event.target.files?.[0])} />
        <span className="certificate-upload-icon">{uploading ? <LoaderCircle className="certificate-spin" /> : <Upload />}</span>
        <strong>{uploading ? 'Preparing template…' : 'Upload certificate PDF'}</strong>
        <small>The original artwork stays untouched; editable fields are stored as overlay metadata.</small>
        {uploading && <span className="certificate-progress"><i style={{ width: `${progress}%` }} /></span>}
      </button>

      <div className="certificate-section-heading">
        <div>
          <h2>Templates</h2>
          <p>{templates.length} reusable template{templates.length === 1 ? '' : 's'}</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}><Plus size={16} /> New template</button>
      </div>

      {error && <div className="certificate-alert is-error">{error}</div>}

      {loading ? (
        <div className="certificate-empty"><LoaderCircle className="certificate-spin" /> Waking the certificate service…</div>
      ) : templates.length === 0 ? (
        <div className="certificate-empty">
          <Award size={34} />
          <strong>No templates yet</strong>
          <span>Upload your first certificate PDF to open the editor.</span>
        </div>
      ) : (
        <div className="certificate-template-grid">
          {templates.map((template) => (
            <article className="certificate-template-card" key={template.id}>
              <button type="button" className="certificate-template-main" onClick={() => navigate(`/certificates/templates/${template.id}/editor`)}>
                <span><FileText size={24} /></span>
                <h3>{template.name}</h3>
                <p>{template.page_count} page{template.page_count === 1 ? '' : 's'} · {template.status}</p>
                <small>{template.original_filename}</small>
              </button>
              <footer>
                <button type="button" onClick={() => navigate(`/certificates/templates/${template.id}/generate`)}>Generate</button>
                <button type="button" className="is-danger" disabled={deleting === template.id} onClick={() => handleDelete(template)}>
                  <Trash2 size={15} /> {deleting === template.id ? 'Deleting…' : 'Delete'}
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <p className="certificate-backend-note">API: {CERTIFICATE_BACKEND}</p>
    </section>
  );
};

export default CertificateTemplates;
