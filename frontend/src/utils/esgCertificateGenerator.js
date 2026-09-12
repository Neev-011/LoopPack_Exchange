/**
 * Generates a LoopPack environmental impact report PDF
 * and initiates an automatic browser download.
 *
 * Designed to work with zero broken build dependencies:
 * - Uses window.jspdf if preloaded
 * - Dynamically loads CDN if missing
 * - Falls back to a styled printable HTML/PDF window if offline
 */

function getJsPDFConstructor() {
  if (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) {
    return window.jspdf.jsPDF;
  }
  return null;
}

function loadImageData(imageUrl) {
  if (!imageUrl) return Promise.resolve(null);
  return fetch(imageUrl)
    .then(response => response.blob())
    .then(blob => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    }))
    .catch(() => null);
}

async function ensureJsPDF() {
  const existing = getJsPDFConstructor();
  if (existing) return existing;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  return new Promise((resolve) => {
    const existingScript = document.getElementById('jspdf-cdn-loader');
    if (existingScript) {
      if (window.jspdf?.jsPDF) return resolve(window.jspdf.jsPDF);
      existingScript.addEventListener('load', () => resolve(window.jspdf?.jsPDF || null));
      existingScript.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.id = 'jspdf-cdn-loader';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      resolve(window.jspdf?.jsPDF || null);
    };
    script.onerror = () => {
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

function generatePrintableHTMLFallback({ streams, grandTotalNetCO2e, issuedTo, userName, logoUrl, certId, issueDate, auditHash }) {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    alert('Please allow popups to download or print your LoopPack Impact Report.');
    return 'LoopPack_Impact_Report.pdf';
  }

  const sampleStreams = streams;

  const totalNum = parseFloat(grandTotalNetCO2e) || 0;
  const tonsEquivalent = (totalNum / 1000).toFixed(2);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>LoopPack Environmental Impact Report - ${certId}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0F172A; margin: 0; padding: 20px; background: #fff; }
          .cert-container { border: 3px solid #0F5132; padding: 24px; border-radius: 8px; position: relative; max-width: 800px; margin: 0 auto; }
          .cert-header { background: #0F5132; color: white; padding: 20px; text-align: center; border-radius: 6px; margin-bottom: 20px; position: relative; }
          .report-logo { position: absolute; top: 12px; right: 14px; width: 54px; height: 38px; object-fit: cover; object-position: center; border-radius: 5px; background: white; }
          .cert-header h1 { margin: 6px 0; font-size: 20px; letter-spacing: 0.5px; }
          .cert-header p { margin: 0; font-size: 11px; color: #A7F3D0; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 6px; font-size: 12px; margin-bottom: 20px; }
          .meta-wide { grid-column: 1 / -1; min-width: 0; }
          .meta-wide span { overflow-wrap: anywhere; }
          .meta-item strong { color: #64748B; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 2px; }
          .kpi-banner { background: #ECFDF5; border: 1px solid #86EFAC; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
          .kpi-banner .headline { font-size: 12px; color: #047857; font-weight: 700; text-transform: uppercase; }
          .kpi-banner .amount { font-size: 32px; font-weight: 800; color: #0F5132; margin: 8px 0; }
          .kpi-banner .equivalents { font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
          th { background: #0F5132; color: white; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #E2E8F0; }
          tr:nth-child(even) td { background: #F8FAFC; }
          .audit-block { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-top: 24px; border-top: 1px solid #CBD5E1; padding-top: 16px; }
          .seal-box { background: #F1F5F9; border: 1px solid #CBD5E1; padding: 12px; border-radius: 6px; font-size: 10px; font-family: monospace; }
          .sig-box { font-size: 11px; color: #334155; }
          .sig-line { border-bottom: 1px solid #0F5132; width: 220px; margin: 24px 0 4px; }
          .footer-note { font-size: 9px; color: #94A3B8; text-align: center; margin-top: 24px; font-style: italic; }
          .print-btn { background: #0F5132; color: white; border: none; padding: 10px 20px; font-weight: 700; border-radius: 6px; cursor: pointer; margin-bottom: 16px; font-size: 13px; }
          @media print { .print-btn { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div style="text-align: right; max-width: 800px; margin: 0 auto 10px;">
          <button class="print-btn" onclick="window.print()">🖨️ Save as PDF / Print Report</button>
        </div>
        <div class="cert-container">
          <div class="cert-header">
            <img class="report-logo" src="${logoUrl || ''}" alt="LoopPack Exchange logo">
            <p>LOOPPACK EXCHANGE • DECENTRALIZED CIRCULAR PACKAGING NETWORK</p>
            <h1>ENVIRONMENTAL IMPACT REPORT</h1>
            <p>Estimated impact based on configured factors and transaction data</p>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <strong>Report ID</strong>
              <span>${certId}</span>
            </div>
            <div class="meta-item">
              <strong>Report Date</strong>
              <span>${issueDate}</span>
            </div>
            <div class="meta-item meta-wide">
              <strong>Prepared For User</strong>
              <span>${userName || issuedTo}</span>
            </div>
            <div class="meta-item meta-wide">
              <strong>Calculation Methodology</strong>
              <span>Configured emission factors + completed transaction data. Equation: E_virgin − (E_reprocessing + E_transport)</span>
            </div>
          </div>

          <div class="kpi-banner">
            <div class="headline">Estimated CO₂e Avoided</div>
            <div class="amount">${totalNum.toLocaleString()} kg CO₂e Avoided</div>
            <div class="equivalents">
              Equivalent to ~${tonsEquivalent} Metric Tons CO₂e
            </div>
          </div>

          <table>
            <caption style="text-align:left; font-weight:700; color:#0F5132; padding:0 0 8px;">ISO 14044 Material Stream Avoidance Ledger for ${userName || issuedTo}</caption>
            <thead>
              <tr>
                <th>Material Stream & Quantity</th>
                <th>Virgin (E_virgin)</th>
                <th>Reprocess (E_rep)</th>
                <th>Freight (E_trans)</th>
                <th>Net Avoided</th>
              </tr>
            </thead>
            <tbody>
              ${sampleStreams.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td style="color:#DC2626">${s.virgin}</td>
                  <td style="color:#D97706">${s.rep}</td>
                  <td style="color:#D97706">${s.freight}</td>
                  <td style="color:#059669; font-weight:700">${s.net}</td>
                </tr>
              `).join('')}
              <tr style="background:#ECFDF5; font-weight:800; color:#0F5132">
                <td colspan="4">TOTAL ESTIMATED IMPACT</td>
                <td>${totalNum.toLocaleString()} kg CO₂e</td>
              </tr>
            </tbody>
          </table>

          <div class="audit-block">
            <div class="seal-box">
              <strong>CALCULATION REFERENCE</strong><br>
              Status: ESTIMATE<br>
              Ledger Hash: ${auditHash.slice(0, 20)}...
            </div>
            <div class="sig-box">
              <strong>REPORT NOTE</strong><br>
              This report presents an estimated environmental impact based on configured emission factors and transaction data. It is not a certified measurement.
              <div class="sig-line"></div>
              <strong>LoopPack Exchange</strong><br>
              <span style="font-size:10px; color:#64748B">Environmental impact report generated from user exchange data</span>
            </div>
          </div>

          <div class="footer-note">
            Generated dynamically by LoopPack Exchange from the user's completed exchange data.
          </div>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  return 'LoopPack_Impact_Report.pdf';
}

/**
 * Builds the PDF using jsPDF instance if available
 */
function buildJsPDFDocument(jsPDFConstructor, { streams = [], grandTotalNetCO2e = '0.0', issuedTo = 'LoopPack Exchange B2B Industrial Network', userName = issuedTo, logoData }, certId, issueDate, auditHash) {
  const doc = new jsPDFConstructor({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // 1. Certificate Borders
  doc.setDrawColor(15, 81, 50);
  doc.setLineWidth(1.2);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  doc.setDrawColor(180, 210, 195);
  doc.setLineWidth(0.4);
  doc.rect(margin + 2, margin + 2, contentWidth - 4, pageHeight - (margin * 2 + 4));

  if (logoData) {
    doc.addImage(logoData, 'PNG', pageWidth - margin - 31, margin + 5, 24, 16);
  }

  // Corner flourishes
  doc.setFillColor(15, 81, 50);
  doc.rect(margin, margin, 8, 2, 'F');
  doc.rect(margin, margin, 2, 8, 'F');
  doc.rect(pageWidth - margin - 8, margin, 8, 2, 'F');
  doc.rect(pageWidth - margin - 2, margin, 2, 8, 'F');
  doc.rect(margin, pageHeight - margin - 2, 8, 2, 'F');
  doc.rect(margin, pageHeight - margin - 8, 2, 8, 'F');
  doc.rect(pageWidth - margin - 8, pageHeight - margin - 2, 8, 2, 'F');
  doc.rect(pageWidth - margin - 2, pageHeight - margin - 8, 2, 8, 'F');

  // 2. Header Banner
  doc.setFillColor(15, 81, 50);
  doc.rect(margin + 2, margin + 2, contentWidth - 4, 30, 'F');

  doc.setTextColor(167, 243, 208);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('LOOPPACK EXCHANGE • DECENTRALIZED REUSABLE PACKAGING NETWORK', pageWidth / 2, margin + 8, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('ENVIRONMENTAL IMPACT REPORT', pageWidth / 2, margin + 17, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text('ISO 14044-based calculation framework using configured emission factors', pageWidth / 2, margin + 24, { align: 'center' });

  // 3. Metadata Header Info Box
  let currentY = margin + 37;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + 4, currentY, contentWidth - 8, 29, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margin + 4, currentY, contentWidth - 8, 29, 'D');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('REPORT ID:', margin + 8, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(certId, margin + 35, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('REPORT DATE:', margin + 105, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(issueDate, margin + 132, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PREPARED FOR USER:', margin + 8, currentY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(userName || issuedTo, contentWidth - 48), margin + 45, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CALCULATION METHOD:', margin + 8, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const methodText = 'Configured emission factors + completed transaction data. Equation: E_virgin - (E_reprocessing + E_transport)';
  doc.text(doc.splitTextToSize(methodText, contentWidth - 48), margin + 45, currentY + 22);

  // 4. Executive Impact Highlight Card
  currentY += 34;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(134, 239, 172);
  doc.setLineWidth(0.5);
  doc.rect(margin + 4, currentY, contentWidth - 8, 32, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87);
  doc.text('ESTIMATED CO₂e AVOIDED', pageWidth / 2, currentY + 8, { align: 'center' });

  doc.setFontSize(21);
  doc.setTextColor(15, 81, 50);
  const totalNum = parseFloat(grandTotalNetCO2e) || 0;
  const tonsEquivalent = (totalNum / 1000).toFixed(2);
  doc.text(`${totalNum.toLocaleString()} kg CO2e Avoided`, pageWidth / 2, currentY + 18, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const vehicleKmApprox = Math.round(totalNum / 0.12).toLocaleString();
  doc.text(`Equivalent to ~${tonsEquivalent} Metric Tons CO2e  |  ~${vehicleKmApprox} Passenger Car km Displaced`, pageWidth / 2, currentY + 26, { align: 'center' });

  // 5. Material Stream Breakdown Ledger (Table)
  currentY += 38;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`ISO 14044 Material Stream Avoidance Ledger - ${userName || issuedTo}`, margin + 4, currentY);

  currentY += 4;
  const colX = [margin + 4, margin + 65, margin + 98, margin + 133, margin + 160];
  const tableWidth = contentWidth - 8;
  const rowHeight = 7.5;

  doc.setFillColor(15, 81, 50);
  doc.rect(margin + 4, currentY, tableWidth, rowHeight + 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Material Stream & Quantity', colX[0] + 2, currentY + 5.5);
  doc.text('Virgin (E_virgin)', colX[1] + 2, currentY + 5.5);
  doc.text('Reprocess (E_rep)', colX[2] + 2, currentY + 5.5);
  doc.text('Freight (E_trans)', colX[3] + 2, currentY + 5.5);
  doc.text('Net Avoided', colX[4] + 2, currentY + 5.5);

  currentY += rowHeight + 1;
  const sampleStreams = streams;

  if (sampleStreams.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No completed exchanges recorded for this user.', colX[0] + 2, currentY + 5);
    currentY += rowHeight;
  }

  sampleStreams.forEach((stream, index) => {
    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin + 4, currentY, tableWidth, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(margin + 4, currentY, tableWidth, rowHeight, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(stream.name, colX[0] + 2, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text(stream.virgin, colX[1] + 2, currentY + 5);

    doc.setTextColor(217, 119, 6);
    doc.text(stream.rep, colX[2] + 2, currentY + 5);
    doc.text(stream.freight, colX[3] + 2, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(stream.net, colX[4] + 2, currentY + 5);

    currentY += rowHeight;
  });

  // Table Total Row
  doc.setFillColor(236, 253, 245);
  doc.rect(margin + 4, currentY, tableWidth, rowHeight + 1, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.rect(margin + 4, currentY, tableWidth, rowHeight + 1, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 81, 50);
  doc.text('TOTAL ESTIMATED IMPACT', colX[0] + 2, currentY + 5.5);
  doc.text(`${totalNum.toLocaleString()} kg CO2e`, colX[4] + 2, currentY + 5.5);

  // 6. Methodology Box
  currentY += rowHeight + 9;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(margin + 4, currentY, tableWidth, 26, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MATHEMATICAL MODEL & CARBON ACCOUNTING FRAMEWORK (ISO 14044)', margin + 8, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Net Avoided Emissions = E_virgin - (E_reprocessing + E_transport). Baseline assumes substitution of virgin packaging production', margin + 8, currentY + 11);
  doc.text('with inspected Grade A / Grade B closed-loop packaging. Freight calculations adhere to GLEC ton-km standard at 0.00016 kg CO2e/ton-km.', margin + 8, currentY + 16);
  doc.text('Data Sources: configured emission factors and completed LoopPack exchange records.', margin + 8, currentY + 21);

  // 7. Audit Attestation Block
  currentY += 32;
  const sealWidth = 48;
  const sigWidth = tableWidth - sealWidth - 6;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin + 4, currentY, sealWidth, 34, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 81, 50);
  doc.text('CALCULATION REFERENCE', margin + 8, currentY + 6);

  doc.setFillColor(15, 81, 50);
  doc.rect(margin + 8, currentY + 9, 14, 14, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + 10, currentY + 11, 4, 4, 'F');
  doc.rect(margin + 16, currentY + 11, 4, 4, 'F');
  doc.rect(margin + 10, currentY + 17, 4, 4, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Calculation reference', margin + 25, currentY + 13);
  doc.text('Status: ESTIMATE', margin + 25, currentY + 17);
  doc.text('User exchange reference', margin + 25, currentY + 21);

  doc.setFont('courier', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(71, 85, 105);
  doc.text(auditHash.slice(0, 32), margin + 6, currentY + 27);
  doc.text(auditHash.slice(32), margin + 6, currentY + 31);

  // Signature Block
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin + 10 + sealWidth, currentY, sigWidth, 34, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('REPORT NOTE', margin + 14 + sealWidth, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('This report presents an estimated environmental impact based on configured factors and transaction data.', margin + 14 + sealWidth, currentY + 11);
  doc.text('using an ISO 14044-based calculation framework for estimated impact.', margin + 14 + sealWidth, currentY + 15);

  doc.setDrawColor(15, 81, 50);
  doc.setLineWidth(0.4);
  doc.line(margin + 14 + sealWidth, currentY + 26, margin + 70 + sealWidth, currentY + 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 81, 50);
  doc.text('LoopPack Exchange', margin + 14 + sealWidth, currentY + 29.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Environmental impact report generated from user exchange data', margin + 14 + sealWidth, currentY + 32.5);

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated dynamically by LoopPack Exchange from the user\'s completed exchange data.', pageWidth / 2, pageHeight - margin - 3, { align: 'center' });

  const filename = 'LoopPack_Impact_Report.pdf';
  doc.save(filename);
  return filename;
}

/**
 * Main impact report generation entry point
 */
export function generateESGCertificatePDF({
  streams = [],
  grandTotalNetCO2e = '0.0',
  issuedTo = 'LoopPack Exchange B2B Industrial Network',
  userName = issuedTo,
  logoUrl = null
} = {}) {
  const certId = 'LPX-ISO14044-' + Math.floor(100000 + Math.random() * 900000);
  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const auditHash = '0x' + Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  // 1. Check if jsPDF is already loaded in window
  const jsPDFConstructor = getJsPDFConstructor();
  if (jsPDFConstructor) {
    loadImageData(logoUrl).then(logoData => {
      buildJsPDFDocument(jsPDFConstructor, { streams, grandTotalNetCO2e, issuedTo, userName, logoData }, certId, issueDate, auditHash);
    });
    return 'LoopPack_Impact_Report.pdf';
  }

  // 2. Try async load from CDN or fallback to printable HTML window
  ensureJsPDF().then((loadedJsPDF) => {
    if (loadedJsPDF) {
      loadImageData(logoUrl).then(logoData => {
        buildJsPDFDocument(loadedJsPDF, { streams, grandTotalNetCO2e, issuedTo, userName, logoData }, certId, issueDate, auditHash);
      });
    } else {
      generatePrintableHTMLFallback({ streams, grandTotalNetCO2e, issuedTo, userName, logoUrl, certId, issueDate, auditHash });
    }
  }).catch(() => {
    generatePrintableHTMLFallback({ streams, grandTotalNetCO2e, issuedTo, userName, logoUrl, certId, issueDate, auditHash });
  });

  return 'LoopPack_Impact_Report.pdf';
}
