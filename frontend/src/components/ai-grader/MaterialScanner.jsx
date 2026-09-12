import React, { useState } from 'react';
import { Camera, Sparkles, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';

export default function MaterialScanner({ onScanned }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);

  const simulateScan = () => {
    setIsScanning(true);
    setScannedResult(null);
    setTimeout(() => {
      setIsScanning(false);
      const result = {
        detectedType: 'cardboard',
        materialName: 'Corrugated Cardboard (Double-Wall)',
        confidence: '98.4%',
        suggestedGrade: 'A',
        suggestedGradeReason: 'Clean surface, no oil/moisture contamination, structural integrity intact.',
        estWeightPerUnitKg: 0.5
      };
      setScannedResult(result);
      if (onScanned) onScanned(result);
    }, 1800);
  };

  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Cpu size={22} color="#10B981" />
        <h3 style={{ fontSize: '1.15rem', color: '#0F172A' }}>Module 1: AI Vision Material Grading</h3>
      </div>

      <div style={{ background: '#F8FAFC', border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '30px', textAlign: 'center', cursor: 'pointer' }} onClick={simulateScan}>
        <div style={{ width: '56px', height: '56px', background: '#ECFDF5', color: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Camera size={26} />
        </div>
        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0F172A' }}>Upload or Snap Photo of Packaging Waste</div>
        <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>
          AI automatically detects material type (Cardboard, Euro-Pallet, HDPE, LDPE) and quality grade.
        </p>

        <button className="btn-primary" style={{ marginTop: '16px' }} disabled={isScanning}>
          {isScanning ? (
            <>
              <Sparkles size={16} className="animate-spin" /> Analyzing Image with Computer Vision...
            </>
          ) : (
            <>
              <Sparkles size={16} /> Run AI Material Scanner
            </>
          )}
        </button>
      </div>

      {scannedResult && (
        <div style={{ marginTop: '20px', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: '700', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={18} /> AI Scan Completed ({scannedResult.confidence} Match)
            </span>
            <span style={{ background: '#059669', color: 'white', fontWeight: '700', fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px' }}>
              Suggested Grade {scannedResult.suggestedGrade}
            </span>
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#0F172A' }}>
            {scannedResult.materialName}
          </div>
          <p style={{ fontSize: '0.84rem', color: '#334155', marginTop: '4px' }}>
            {scannedResult.suggestedGradeReason}
          </p>
        </div>
      )}
    </div>
  );
}
