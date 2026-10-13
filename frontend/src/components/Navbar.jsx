import React from 'react';
import { Activity, ShieldCheck, Cpu } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, apiStatus }) {
  const tabs = [
    { id: 'predictor', label: 'Clinical Predictor', icon: '🩺' },
    { id: 'threshold', label: 'Threshold Explorer', icon: '⚖️' },
    { id: 'analytics', label: 'Model Analytics', icon: '📊' },
    { id: 'batch', label: 'Batch Screening', icon: '📁' }
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-glass)',
      padding: '14px 28px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            <Activity size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                Onco<span className="gradient-text-cyan">Vision</span> AI
              </h1>
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                v1.0 Pro
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
              Breast Tumour Cytology & Malignancy Intelligence Platform
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Engine status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: '1px solid var(--border-glass)',
            fontSize: '0.75rem'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: apiStatus === 'online' ? '#10b981' : '#f59e0b',
              boxShadow: apiStatus === 'online' ? '0 0 10px #10b981' : 'none'
            }} />
            <span style={{ color: 'var(--text-muted)' }}>
              {apiStatus === 'online' ? 'SVM RBF (99.1% Acc)' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
