import React, { useEffect, useState } from 'react';
import { ChevronDown, Download, FileCheck, Info, Leaf, Recycle, Scale } from 'lucide-react';
import { calculateAvoidedCarbon, MATERIAL_EMISSION_FACTORS, FREIGHT_EMISSION_FACTOR_PER_TON_KM } from '../utils/carbonEngine';
import { generateESGCertificatePDF } from '../utils/esgCertificateGenerator';
import { useAuth } from '../context/AuthContext';
import brandShowcase from '../assets/brand-showcase.png';

const API_BASE_URL = 'http://localhost:5001/api/v1';

const formatNumber = (value, maximumFractionDigits = 1) => (
  value.toLocaleString('en-US', { maximumFractionDigits })
);

export default function CarbonDashboardPage() {
  const { currentUser } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function loadCompletedExchanges() {
      if (!currentUser?.username) {
        setExchanges([]);
        setLoadError('Sign in to view your personal material impact.');
        setLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams({ buyerUsername: currentUser.username });
        const response = await fetch(`${API_BASE_URL}/exchanges/completed?${params}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load completed exchanges.');
        setExchanges(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        setLoadError('Your completed exchanges could not be loaded. Showing zero until the marketplace is connected.');
      } finally {
        setLoading(false);
      }
    }
    loadCompletedExchanges();
  }, [currentUser?.username]);

  const streams = exchanges.map((exchange) => {
    const materialKey = MATERIAL_EMISSION_FACTORS[exchange.materialType] ? exchange.materialType : 'cardboard';
    const result = calculateAvoidedCarbon(materialKey, exchange.quantity, exchange.distanceKm, exchange.grade);
    return {
      ...exchange,
      key: exchange.id,
      materialKey,
      label: exchange.listingTitle || result.materialName,
      quantityLabel: `${formatNumber(exchange.quantity, 2)} ${exchange.unit || 'units'}`,
      action: exchange.grade === 'A' ? 'Reused' : 'Recycled',
      result
    };
  });

  const totalWeightKg = streams.reduce((sum, stream) => sum + stream.result.totalWeightKg, 0);
  const totalNetCO2e = streams.reduce((sum, stream) => sum + stream.result.netCO2eAvoided, 0);
  const grandTotalNetCO2e = totalNetCO2e.toFixed(1);

  const handleDownloadReport = () => {
    setDownloading(true);
    setDownloadSuccess(null);

    setTimeout(() => {
      try {
        const reportStreams = streams.map((stream) => ({
          name: `${stream.label} (${stream.quantityLabel})`,
          virgin: `+${stream.result.eVirgin.toLocaleString()} kg`,
          rep: `-${stream.result.eReprocessing.toLocaleString()} kg`,
          freight: `-${stream.result.eTransport.toLocaleString()} kg`,
          net: `${stream.result.netCO2eAvoided.toLocaleString()} kg`
        }));
        const userName = currentUser.companyName || currentUser.username;
        const filename = generateESGCertificatePDF({
          streams: reportStreams,
          grandTotalNetCO2e,
          issuedTo: userName,
          userName,
          logoUrl: brandShowcase
        });
        setDownloadSuccess({ filename, time: new Date().toLocaleTimeString() });
      } catch (err) {
        console.error('Failed to generate impact report:', err);
      } finally {
        setDownloading(false);
      }
    }, 400);
  };

  return (
    <div className="impact-dashboard">
      <header className="impact-header">
        <div>
          <div className="impact-eyebrow"><Leaf size={16} /> LoopPack environmental impact</div>
          <h1>Impact Dashboard</h1>
          <p>Estimated environmental impact from materials exchanged through LoopPack.</p>
        </div>
        <button className="btn-primary" onClick={handleDownloadReport} disabled={downloading}>
          <Download size={18} /> {downloading ? 'Preparing report...' : 'Download Impact Report'}
        </button>
      </header>

      {downloadSuccess && (
        <div className="impact-success" role="status">
          <FileCheck size={21} />
          <span>Impact report downloaded as <strong>{downloadSuccess.filename}</strong> at {downloadSuccess.time}.</span>
          <button onClick={() => setDownloadSuccess(null)} aria-label="Dismiss report message">×</button>
        </div>
      )}

      {loadError && <div className="impact-success" role="status"><Info size={18} /> {loadError}</div>}

      <section className="primary-impact-card" aria-labelledby="primary-impact-heading">
        <div className="primary-impact-copy">
          <div className="impact-eyebrow"><Recycle size={17} /> Estimated impact</div>
          <h2 id="primary-impact-heading">Estimated CO₂e Avoided</h2>
          <div className="primary-impact-value">{formatNumber(totalNetCO2e, 1)} <span>kg CO₂e</span></div>
          <p>Based on {formatNumber(totalWeightKg / 1000, 2)} tonnes of materials from completed LoopPack exchanges.</p>
          <small>Based on configured emission factors and transaction data. This is an estimate, not a guaranteed environmental saving.</small>
        </div>
        <div className="primary-impact-mark"><Scale size={38} /></div>
      </section>

      <section className="impact-metrics" aria-label="Supporting impact metrics">
        <div className="impact-metric-card"><span>Material Recirculated</span><strong>{formatNumber(totalWeightKg / 1000, 2)} tonnes</strong><small>Across the listed material streams</small></div>
        <div className="impact-metric-card"><span>Completed Exchanges</span><strong>{exchanges.length}</strong><small>Recorded marketplace purchases</small></div>
        <div className="impact-metric-card"><span>Waste Diverted</span><strong>{formatNumber(totalWeightKg / 1000, 2)} tonnes</strong><small>Material represented in the current estimate</small></div>
      </section>

      <section className="impact-section" aria-labelledby="material-impact-heading">
        <div className="section-heading"><div><h2 id="material-impact-heading">ISO 14044 Material Stream Avoidance Ledger</h2><p>{currentUser?.companyName || currentUser?.username || 'Your'} material impact from completed LoopPack exchanges.</p></div></div>
        <div className="impact-table-wrap">
          <table className="impact-table">
            <thead><tr><th>Material</th><th>Quantity</th><th>Circular Action</th><th>Estimated CO₂e Avoided</th></tr></thead>
            <tbody>
              {streams.length === 0 && <tr><td colSpan="4" className="impact-empty">{loading ? 'Loading completed exchanges...' : 'No completed exchanges yet. Purchase a marketplace lot to start the impact total.'}</td></tr>}
              {streams.map((stream) => (
                <tr key={stream.key}>
                  <td><strong>{stream.label}</strong><small>{formatNumber(stream.result.totalWeightTons, 2)} tonnes material weight</small></td>
                  <td>{stream.quantityLabel}</td><td><span className="action-pill">{stream.action}</span></td>
                  <td className="impact-table-value">{formatNumber(stream.result.netCO2eAvoided, 2)} kg CO₂e</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="calculation-details">
        <summary><span><h2>How is this estimate calculated?</h2><p>Open the calculation method and inputs used for each material stream.</p></span><ChevronDown size={20} /></summary>
        <div className="calculation-content">
          <div className="formula-card"><div><span>Estimated CO₂e Avoided</span><strong>E<sub>virgin</sub> − (E<sub>reprocessing</sub> + E<sub>transport</sub>)</strong></div><p>Virgin material emissions<br />− Reprocessing emissions<br />− Transport emissions</p></div>
          <div className="calculation-streams">
            {streams.length === 0 && <p className="impact-empty">No completed exchanges yet. Calculation details will appear here after a marketplace purchase.</p>}
            {streams.map((stream) => {
              const factor = MATERIAL_EMISSION_FACTORS[stream.materialKey];
              return (
                <div className="calculation-stream" key={stream.key}>
                  <div className="calculation-stream-title"><strong>{stream.label}</strong><span>{stream.action} • Grade {stream.grade}</span></div>
                  <div className="calculation-inputs">
                    <span>Material quantity<strong>{formatNumber(stream.result.totalWeightKg, 1)} kg</strong></span>
                    <span>Virgin emission factor<strong>{factor.virginFactorKg} kg CO₂e/kg</strong></span>
                    <span>Reprocessing factor<strong>{stream.grade === 'A' ? '0' : factor.reprocessFactorKg} kg CO₂e/kg</strong></span>
                    <span>Transport distance<strong>{stream.distanceKm} km</strong></span>
                    <span>Transport emission factor<strong>{FREIGHT_EMISSION_FACTOR_PER_TON_KM} kg CO₂e/ton-km</strong></span>
                  </div>
                  <div className="calculation-result">{formatNumber(stream.result.eVirgin, 2)} − ({formatNumber(stream.result.eReprocessing, 2)} + {formatNumber(stream.result.eTransport, 3)}) = <strong>{formatNumber(stream.result.netCO2eAvoided, 2)} kg CO₂e</strong></div>
                </div>
              );
            })}
          </div>
        </div>
      </details>

      <section className="estimate-note" aria-labelledby="estimate-note-heading">
        <Info size={21} />
        <div><h2 id="estimate-note-heading">About this estimate</h2><p>This is an estimated environmental impact, not a certified measurement.</p><ul><li>Material quantity and category</li><li>Reuse or recycling pathway</li><li>Transport distance</li><li>Configured emission factors</li></ul><small>Last calculated: {exchanges.length ? 'When the dashboard loaded' : 'No completed exchanges yet'}</small></div>
      </section>
    </div>
  );
}
