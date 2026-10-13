import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PredictorTab from './components/PredictorTab';
import ThresholdTab from './components/ThresholdTab';
import AnalyticsTab from './components/AnalyticsTab';
import BatchTab from './components/BatchTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('predictor');
  const [metadata, setMetadata] = useState(null);
  const [apiStatus, setApiStatus] = useState('connecting');
  const [prediction, setPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Load backend status and metadata on initial mount
  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'online') {
          setApiStatus('online');
        }
      })
      .catch(() => setApiStatus('offline'));

    fetch('/api/metadata')
      .then(res => res.json())
      .then(data => {
        setMetadata(data);
      })
      .catch(err => console.error("Error loading metadata:", err));
  }, []);

  const handlePredict = async (features, threshold = 0.5) => {
    setIsPredicting(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features, threshold })
      });
      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
      }
    } catch (err) {
      console.error("Predict error:", err);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiStatus={apiStatus}
      />

      {/* Main Content Area */}
      <main style={{
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        padding: '32px 28px',
        flex: 1
      }}>
        {activeTab === 'predictor' && (
          <PredictorTab
            metadata={metadata}
            onPredict={handlePredict}
            prediction={prediction}
            isPredicting={isPredicting}
          />
        )}

        {activeTab === 'threshold' && (
          <ThresholdTab />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}

        {activeTab === 'batch' && (
          <BatchTab />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-glass)',
        padding: '24px 28px',
        background: 'rgba(9, 13, 22, 0.9)',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          fontSize: '0.75rem',
          color: 'var(--text-dim)'
        }}>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>OncoVision AI Clinical System</strong> • Breast Cancer Wisconsin Diagnostic Dataset (569 samples, 30 features)
          </div>
          <div>
            Built with <strong>FastAPI</strong> &amp; <strong>React (Vite)</strong> • Tuned RBF Support Vector Machine (99.1% Test Accuracy)
          </div>
        </div>
      </footer>

    </div>
  );
}
