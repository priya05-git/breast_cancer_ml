import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Sliders, Sparkles, RefreshCw, Download, ArrowRight, Activity, Info } from 'lucide-react';

export default function PredictorTab({ metadata, onPredict, prediction, isPredicting }) {
  const [featureValues, setFeatureValues] = useState({});
  const [activeGroup, setActiveGroup] = useState('Worst / Extreme Values');
  const [threshold, setThreshold] = useState(0.5);
  const [selectedPreset, setSelectedPreset] = useState('high_malignant');

  // Initialize with the first preset when metadata loads
  useEffect(() => {
    if (metadata?.presets && metadata.presets.length > 0) {
      const defaultPreset = metadata.presets[0];
      setFeatureValues(defaultPreset.data);
      setSelectedPreset(defaultPreset.id);
      onPredict(defaultPreset.data, threshold);
    } else if (metadata?.features) {
      const initial = {};
      metadata.features.forEach(f => {
        initial[f] = metadata.feature_stats?.[f]?.overall_mean || 10;
      });
      setFeatureValues(initial);
      onPredict(initial, threshold);
    }
  }, [metadata]);

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.id);
    setFeatureValues(preset.data);
    onPredict(preset.data, threshold);
  };

  const handleInputChange = (featureName, value) => {
    const num = parseFloat(value);
    const updated = {
      ...featureValues,
      [featureName]: isNaN(num) ? 0 : num
    };
    setFeatureValues(updated);
    setSelectedPreset(null);
  };

  const handleThresholdChange = (newThreshold) => {
    setThreshold(newThreshold);
    onPredict(featureValues, newThreshold);
  };

  const handleRunPrediction = () => {
    onPredict(featureValues, threshold);
  };

  const handleResetToBenign = () => {
    const benignPreset = metadata?.presets?.find(p => p.id === 'clear_benign');
    if (benignPreset) {
      handlePresetSelect(benignPreset);
    }
  };

  const exportReport = () => {
    if (!prediction) return;
    const reportData = {
      title: "OncoVision AI Biopsy Diagnostic Report",
      date: new Date().toISOString(),
      diagnosis: prediction.prediction,
      malignancy_probability: `${(prediction.probability_malignant * 100).toFixed(1)}%`,
      risk_tier: prediction.risk_tier,
      decision_threshold: threshold,
      top_aberrant_biomarkers: prediction.top_deviations,
      cell_nucleus_features: featureValues
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biopsy_diagnostic_${prediction.prediction.toLowerCase()}_${Date.now()}.json`;
    a.click();
  };

  const currentFeatures = metadata?.grouped_features?.[activeGroup] || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 0.95fr)', gap: '28px', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Controls & Feature Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Preset Selector Banner */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#06b6d4" />
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Clinical Biopsy Presets</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Select sample to test instant inference</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {metadata?.presets?.map((preset) => (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                onClick={() => handlePresetSelect(preset)}
                className={`btn-preset ${selectedPreset === preset.id ? 'active' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>{preset.label}</span>
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: preset.tag.includes('High') ? 'rgba(244,63,94,0.2)' : preset.tag.includes('Low') ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                    color: preset.tag.includes('High') ? '#fb7185' : preset.tag.includes('Low') ? '#34d399' : '#fbbf24',
                    fontWeight: 700
                  }}>
                    {preset.tag}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Feature Inputs Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          
          {/* Header & Category Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Cytology Nuclear Measurements</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                30 morphological features extracted from fine needle aspirate (FNA) digital images
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="btn-reset-values"
                onClick={handleResetToBenign}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                title="Reset to confirmed benign"
              >
                <RefreshCw size={14} />
                <span>Reset</span>
              </button>
              <button
                id="btn-run-prediction"
                onClick={handleRunPrediction}
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '0.82rem' }}
              >
                <Activity size={14} />
                <span>Analyze</span>
              </button>
            </div>
          </div>

          {/* Subcategory Navigation */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '18px', overflowX: 'auto' }}>
            {Object.keys(metadata?.grouped_features || {}).map((groupName) => (
              <button
                key={groupName}
                onClick={() => setActiveGroup(groupName)}
                style={{
                  background: activeGroup === groupName ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  border: activeGroup === groupName ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
                  color: activeGroup === groupName ? '#38bdf8' : 'var(--text-muted)',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {groupName}
              </button>
            ))}
          </div>

          {/* Feature Inputs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {currentFeatures.map((feat) => {
              const stats = metadata?.feature_stats?.[feat] || { min: 0, max: 100, benign_mean: 10, malignant_mean: 20 };
              const currentVal = featureValues[feat] !== undefined ? featureValues[feat] : stats.overall_mean || 0;
              const isElevated = currentVal > (stats.benign_mean + stats.benign_std);

              return (
                <div
                  key={feat}
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: isElevated ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                      {feat}
                    </label>
                    {isElevated && (
                      <span style={{ fontSize: '0.65rem', color: '#fb7185', background: 'rgba(244, 63, 94, 0.15)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                        Elevated
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min={stats.min}
                      max={stats.max}
                      step={(stats.max - stats.min) / 100}
                      value={currentVal}
                      onChange={(e) => handleInputChange(feat, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      className="input-control"
                      value={currentVal}
                      step={(stats.max - stats.min) / 100}
                      onChange={(e) => handleInputChange(feat, e.target.value)}
                      style={{ width: '85px', textAlign: 'right', padding: '4px 8px', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    <span>Normal Benign: ~{stats.benign_mean}</span>
                    <span>Range: {stats.min} - {stats.max}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Operating Decision Threshold slider */}
          <div style={{ marginTop: '24px', padding: '18px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} color="#06b6d4" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Decision Classification Threshold:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>{threshold.toFixed(2)}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {threshold < 0.35 ? '⚠️ High Sensitivity (Catch Every Cancer)' : threshold > 0.65 ? 'High Specificity (Fewer False Alarms)' : 'Standard Diagnostic Balance'}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Diagnostic Prediction Card (Sticky) */}
      <div style={{ position: 'sticky', top: '90px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Main Diagnostic Verdict Card */}
        <div className="glass-panel" style={{
          padding: '28px',
          border: prediction?.is_malignant ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
          boxShadow: prediction?.is_malignant ? '0 10px 30px -10px rgba(244, 63, 94, 0.3)' : '0 10px 30px -10px rgba(16, 185, 129, 0.3)'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                DIAGNOSTIC INFERENCE
              </span>
              <h2 style={{ fontSize: '1.75rem', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {prediction?.is_malignant ? (
                  <>
                    <span className="gradient-text-rose">MALIGNANT</span>
                    <AlertCircle size={26} color="#f43f5e" />
                  </>
                ) : (
                  <>
                    <span style={{ color: '#34d399' }}>BENIGN</span>
                    <CheckCircle2 size={26} color="#10b981" />
                  </>
                )}
              </h2>
            </div>

            <span className={prediction?.is_malignant ? 'badge badge-malignant' : 'badge badge-benign'}>
              {prediction?.risk_tier?.split(' ')[0] || 'ANALYZED'}
            </span>
          </div>

          {/* Probability Gauge / Breakdown */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-glass)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Malignancy Probability:</span>
              <span style={{
                fontWeight: 800,
                fontSize: '1.1rem',
                color: prediction?.is_malignant ? '#fb7185' : '#34d399'
              }}>
                {prediction ? (prediction.probability_malignant * 100).toFixed(1) : '0'}%
              </span>
            </div>

            {/* Visual Probability Bar */}
            <div style={{ height: '10px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${prediction ? prediction.probability_malignant * 100 : 0}%`,
                background: prediction?.is_malignant ? 'linear-gradient(90deg, #f97316 0%, #f43f5e 100%)' : 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                borderRadius: '9999px',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
              {/* Threshold pointer mark */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${threshold * 100}%`,
                width: '3px',
                background: '#ffffff',
                boxShadow: '0 0 6px rgba(255,255,255,0.8)'
              }} title={`Cut-off threshold: ${threshold}`} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              <span>0% Benign</span>
              <span style={{ color: '#38bdf8' }}>Cut-off: {(threshold * 100).toFixed(0)}%</span>
              <span>100% Malignant</span>
            </div>
          </div>

          {/* Clinical Risk Tier Description */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            background: prediction?.is_malignant ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            borderLeft: `4px solid ${prediction?.risk_color || '#06b6d4'}`,
            marginBottom: '20px'
          }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              {prediction?.risk_tier}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              {prediction?.is_malignant
                ? "Nuclear pleomorphism and irregular chromatin density strongly correlate with malignant neoplastic tissue. Immediate histological follow-up recommended."
                : "Cell morphometry shows high regularity in nuclear perimeter and smooth margins typical of non-malignant tissue."}
            </p>
          </div>

          {/* Top Aberrant Nuclear Biomarkers */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} color="#06b6d4" />
              <span>Key Cytological Aberrations (vs. Benign Tissue)</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {prediction?.top_deviations?.map((dev) => (
                <div
                  key={dev.feature}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    fontSize: '0.78rem'
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {dev.feature}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{dev.value}</span>
                    <span style={{
                      fontWeight: 700,
                      color: dev.z_score_vs_benign > 2.0 ? '#fb7185' : dev.z_score_vs_benign > 1.0 ? '#fbbf24' : '#34d399',
                      fontSize: '0.7rem'
                    }}>
                      +{dev.z_score_vs_benign}σ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Report Button */}
          <button
            id="btn-export-report"
            onClick={exportReport}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Download size={16} />
            <span>Export Diagnostic Report (JSON)</span>
          </button>
        </div>

        {/* Quick Clinical Guidance Card */}
        <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(15, 23, 42, 0.6)' }}>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '6px' }}>
            💡 Clinical Practice Note
          </h4>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.4, margin: 0 }}>
            In breast cancer pathology, a <strong>False Negative</strong> (missed malignancy) is clinically devastating. Lowering the decision threshold to 0.30 guarantees 100% malignant recall in test evaluations while keeping false alarms minimal.
          </p>
        </div>

      </div>

    </div>
  );
}
