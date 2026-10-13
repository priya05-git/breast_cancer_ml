import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle, AlertTriangle, Search, Filter } from 'lucide-react';

export default function BatchTab({ onSelectPatientForInspection }) {
  const [file, setFile] = useState(null);
  const [threshold, setThreshold] = useState(0.5);
  const [batchResult, setBatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadSampleCSV = () => {
    window.location.href = '/api/sample-csv';
  };

  const runBatchInference = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/batch-predict?threshold=${threshold}`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setBatchResult(data);
      } else {
        alert("Batch processing error: please verify CSV columns.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process batch upload.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPredictions = batchResult?.predictions?.filter(p => {
    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'MALIGNANT') return matchesSearch && p.prediction === 'Malignant';
    if (filterType === 'BENIGN') return matchesSearch && p.prediction === 'Benign';
    return matchesSearch;
  }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Upload Header Card */}
      <div className="glass-panel" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-neutral">COHORT TRIAGE ENGINE</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Batch Biopsy Screening</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              Mass Population Screening & CSV Ingestion
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '800px', lineHeight: 1.5, margin: 0 }}>
              Upload clinical laboratory spreadsheets containing multi-patient fine needle aspirate (FNA) measurements. Screen hundreds of patients in seconds with custom sensitivity thresholds.
            </p>
          </div>

          <button
            id="btn-download-sample-csv"
            onClick={downloadSampleCSV}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            <span>Download Sample Biopsy CSV</span>
          </button>
        </div>

        {/* Upload Zone */}
        <div style={{
          marginTop: '24px',
          border: '2px dashed var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          padding: '36px 20px',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.4)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="csv-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              <UploadCloud size={28} color="#06b6d4" />
            </div>

            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {file ? file.name : "Click to select or drag and drop Patient Biopsy CSV"}
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                Supports CSV with 30 cytology features (or Patient_ID + cell measurements)
              </p>
            </div>
          </label>

          {file && (
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Threshold:</span>
                <input
                  type="number"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="input-control"
                  style={{ width: '70px', padding: '3px 8px', fontSize: '0.8rem' }}
                />
              </div>

              <button
                id="btn-process-batch"
                onClick={runBatchInference}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '8px 22px' }}
              >
                <FileSpreadsheet size={16} />
                <span>{loading ? "Processing Cohort..." : "Process Batch Screening"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Batch Results View */}
      {batchResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Screened</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>
                {batchResult.total_cases}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Patients evaluated</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f43f5e' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suspected Malignant</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fb7185', margin: '4px 0' }}>
                {batchResult.malignant_count}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {batchResult.malignant_percentage}% of total cohort
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Benign Confirmed</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#34d399', margin: '4px 0' }}>
                {batchResult.benign_count}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {(100 - batchResult.malignant_percentage).toFixed(1)}% of total cohort
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #06b6d4' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cut-off Applied</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
                {batchResult.threshold_used}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Decision boundary</div>
            </div>

          </div>

          {/* Patient Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Screened Patient Triage List</h3>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search Patient ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-control"
                    style={{ width: '200px', padding: '6px 10px', fontSize: '0.8rem' }}
                  />
                </div>

                {/* Filter */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.7)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                  {['ALL', 'MALIGNANT', 'BENIGN'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterType(f)}
                      style={{
                        background: filterType === f ? 'var(--cyan-500)' : 'transparent',
                        color: filterType === f ? '#ffffff' : 'var(--text-muted)',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px' }}>Patient / Biopsy ID</th>
                    <th style={{ padding: '10px 14px' }}>Diagnosis</th>
                    <th style={{ padding: '10px 14px' }}>Malignancy Probability</th>
                    <th style={{ padding: '10px 14px' }}>Clinical Risk Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.map((row) => (
                    <tr
                      key={row.row_index}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: row.prediction === 'Malignant' ? 'rgba(244, 63, 94, 0.04)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: 'var(--text-dim)' }}>{row.row_index}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>{row.id}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={row.prediction === 'Malignant' ? 'badge badge-malignant' : 'badge badge-benign'}>
                          {row.prediction}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '180px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '45px' }}>
                            {(row.probability_malignant * 100).toFixed(1)}%
                          </span>
                          <div style={{ flex: 1, height: '6px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${row.probability_malignant * 100}%`,
                              background: row.prediction === 'Malignant' ? '#f43f5e' : '#10b981',
                              borderRadius: '9999px'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                        {row.risk_tier}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
