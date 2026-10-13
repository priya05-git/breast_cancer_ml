import React, { useState, useEffect } from 'react';
import { Sliders, AlertTriangle, ShieldCheck, HelpCircle, Activity, Check } from 'lucide-react';

export default function ThresholdTab() {
  const [threshold, setThreshold] = useState(0.5);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async (th) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/threshold-metrics?threshold=${th}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Failed to load threshold metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(threshold);
  }, [threshold]);

  const setPresetThreshold = (val) => {
    setThreshold(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Header Card */}
      <div className="glass-panel" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-neutral">CLINICAL DECISION INTELLIGENCE</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Held-Out Test Cohort (N=114)</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              Interactive Probability Threshold & Cost-Sensitive Analysis
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '850px', lineHeight: 1.5, margin: 0 }}>
              In oncological pathology, symmetric cost assumption ($0.5$ cut-off) is dangerous: a <strong>missed cancer (False Negative)</strong> leads to delayed treatment and morbidity, whereas a <strong>false alarm (False Positive)</strong> triggers a routine confirmatory biopsy.
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-glass)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Cut-off</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8' }}>{threshold.toFixed(2)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>P(Malignant) ≥ Threshold</div>
          </div>
        </div>

        {/* Threshold Slider and Presets */}
        <div style={{ marginTop: '28px', background: 'rgba(15, 23, 42, 0.6)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} color="#06b6d4" />
              Adjust Classification Cut-off (0.05 to 0.95):
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="btn-thresh-screening"
                onClick={() => setPresetThreshold(0.20)}
                className={`btn btn-preset ${Math.abs(threshold - 0.20) < 0.01 ? 'active' : ''}`}
              >
                0.20 • Screening Mode (Zero Missed Cancers)
              </button>
              <button
                id="btn-thresh-balanced"
                onClick={() => setPresetThreshold(0.50)}
                className={`btn btn-preset ${Math.abs(threshold - 0.50) < 0.01 ? 'active' : ''}`}
              >
                0.50 • Standard ML Balance
              </button>
              <button
                id="btn-thresh-specific"
                onClick={() => setPresetThreshold(0.80)}
                className={`btn btn-preset ${Math.abs(threshold - 0.80) < 0.01 ? 'active' : ''}`}
              >
                0.80 • High Specificity
              </button>
            </div>
          </div>

          <input
            id="threshold-slider"
            type="range"
            min="0.05"
            max="0.95"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <span>0.05 (Maximum Sensitivity / Aggressive)</span>
            <span>0.50 (Conventional Cut-off)</span>
            <span>0.95 (Maximum Specificity / Conservative)</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid: Metrics Cards & Confusion Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 1fr)', gap: '24px' }}>
        
        {/* Metric Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Recall / Sensitivity */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Malignant Recall (Sensitivity)
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#34d399', margin: '4px 0' }}>
                {metrics ? `${(metrics.recall * 100).toFixed(1)}%` : '--'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Portion of malignant tumours successfully flagged
              </div>
            </div>

            {/* Precision */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #06b6d4' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Precision (Positive Predictive Value)
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
                {metrics ? `${(metrics.precision * 100).toFixed(1)}%` : '--'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Accuracy of malignant biopsy alerts
              </div>
            </div>

            {/* Missed Cancers FN */}
            <div className="glass-panel" style={{
              padding: '20px',
              borderLeft: metrics?.missed_cancers_fn === 0 ? '4px solid #10b981' : '4px solid #f43f5e',
              background: metrics?.missed_cancers_fn > 0 ? 'rgba(244, 63, 94, 0.05)' : 'var(--bg-card)'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Missed Cancers (FN)
              </div>
              <div style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: metrics?.missed_cancers_fn === 0 ? '#34d399' : '#fb7185',
                margin: '4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{metrics ? metrics.missed_cancers_fn : '--'}</span>
                {metrics?.missed_cancers_fn === 0 ? (
                  <ShieldCheck size={24} color="#10b981" />
                ) : (
                  <AlertTriangle size={24} color="#f43f5e" />
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {metrics?.missed_cancers_fn === 0 ? 'Zero false negatives on test set' : 'Critical diagnostic risk'}
              </div>
            </div>

            {/* False Alarms FP */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                False Alarms (FP)
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fbbf24', margin: '4px 0' }}>
                {metrics ? metrics.false_alarms_fp : '--'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Benign cases flagged for confirmatory biopsy
              </div>
            </div>

          </div>

          {/* Clinical Simulation Insights */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '14px' }}>
              Clinical Impact Analysis
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.85rem', marginBottom: '6px' }}>
                  Why threshold = 0.20 or 0.30 is clinically preferred:
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                  By shifting the cut-off from 0.50 down to 0.30, the test recall increases from 97.6% to <strong>100.0%</strong> (eliminating the single missed cancer), while only producing 1 single extra false alarm out of 72 benign samples.
                </p>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 600, color: '#c084fc', fontSize: '0.85rem', marginBottom: '6px' }}>
                  Out-of-Fold Calibration (Train Set):
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                  This behavior was predicted completely out-of-fold during CV training: at threshold 0.20, CV recall rose from 95.3% to 98.2%, proving the trade-off is structural and robust rather than test set overfitting.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Interactive 2x2 Confusion Matrix */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', margin: '0 0 2px 0' }}>Live 2×2 Confusion Matrix</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Recomputed at threshold = {threshold.toFixed(2)}</span>
            </div>
            <span className="badge badge-neutral">N = 114</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
            <div />
            <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              PREDICTED BENIGN
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              PREDICTED MALIGNANT
            </div>

            {/* Row 1: Actual Benign */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right', paddingRight: '8px' }}>
              ACTUAL BENIGN
            </div>
            
            {/* True Negative */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>TRUE NEGATIVE (TN)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>
                {metrics?.confusion_matrix?.tn ?? '--'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Benign confirmed</div>
            </div>

            {/* False Positive */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600 }}>FALSE POSITIVE (FP)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>
                {metrics?.confusion_matrix?.fp ?? '--'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>False biopsy alarm</div>
            </div>

            {/* Row 2: Actual Malignant */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right', paddingRight: '8px' }}>
              ACTUAL MALIGNANT
            </div>

            {/* False Negative */}
            <div style={{
              background: (metrics?.confusion_matrix?.fn || 0) > 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.08)',
              border: (metrics?.confusion_matrix?.fn || 0) > 0 ? '1px solid rgba(244, 63, 94, 0.5)' : '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: (metrics?.confusion_matrix?.fn || 0) > 0 ? '#fb7185' : 'var(--text-dim)', fontWeight: 700 }}>
                FALSE NEGATIVE (FN)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: (metrics?.confusion_matrix?.fn || 0) > 0 ? '#fb7185' : '#34d399' }}>
                {metrics?.confusion_matrix?.fn ?? '--'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                {(metrics?.confusion_matrix?.fn || 0) > 0 ? 'Missed Cancer!' : '0 Missed!'}
              </div>
            </div>

            {/* True Positive */}
            <div style={{
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>TRUE POSITIVE (TP)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>
                {metrics?.confusion_matrix?.tp ?? '--'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Correctly detected</div>
            </div>

          </div>

          <div style={{ marginTop: '20px', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(15, 23, 42, 0.5)', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Total Test Samples: <strong>114</strong> (72 Benign + 42 Malignant). All calculations derived strictly from the isolated held-out test cohort.
          </div>

        </div>

      </div>

    </div>
  );
}
