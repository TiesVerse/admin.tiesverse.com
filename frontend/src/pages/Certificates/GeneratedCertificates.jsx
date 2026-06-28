import { useEffect, useState } from 'react';
import { Download, FileCheck2, LoaderCircle } from 'lucide-react';
import {
  downloadCertificateAsset,
  generateCertificate,
  listCertificateRecords,
} from './certificateApi';
import './Certificates.css';

const GeneratedCertificates = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listCertificateRecords()
      .then(setRecords)
      .catch((caught) => setError(caught?.message || 'Could not load certificate records.'))
      .finally(() => setLoading(false));
  }, []);

  const downloadOnDemand = async (record) => {
    setDownloading(record.id);
    setError('');
    try {
      const generated = await generateCertificate(record.template_id, record.data || {});
      await downloadCertificateAsset(generated.blob, `${record.certificate_id}.pdf`);
    } catch (caught) {
      setError(caught?.message || 'Could not generate this certificate.');
    } finally {
      setDownloading('');
    }
  };

  return (
    <section className="certificate-page">
      <header className="certificate-page-header">
        <div>
          <span className="certificate-eyebrow">Certificate registry</span>
          <h1>Generated</h1>
          <p>No PDFs are archived here. This lists certificate IDs and renders a fresh download only when requested.</p>
        </div>
      </header>

      {error && <div className="certificate-alert is-error">{error}</div>}
      {loading ? (
        <div className="certificate-empty"><LoaderCircle className="certificate-spin" /> Loading certificate records…</div>
      ) : records.length === 0 ? (
        <div className="certificate-empty"><FileCheck2 size={34} /><strong>No generated records yet</strong></div>
      ) : (
        <div className="certificate-generated-list">
          {records.map((record) => (
            <article key={record.id}>
              <span><FileCheck2 size={20} /></span>
              <div>
                <h3>{record.person_name || 'Certificate recipient'}</h3>
                <p>
                  <b>{record.source_type === 'offer' ? 'Offer letter' : 'Webinar certificate'}</b>
                  {' · '}
                  {record.subject_title}
                  {' · '}
                  {record.template_name}
                </p>
                <small>Certificate ID: {record.certificate_id}</small>
              </div>
              <button type="button" disabled={downloading === record.id} onClick={() => downloadOnDemand(record)}>
                {downloading === record.id ? <LoaderCircle className="certificate-spin" size={16} /> : <Download size={16} />} Download
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default GeneratedCertificates;
