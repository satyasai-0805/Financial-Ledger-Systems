import React, { useState, useEffect } from 'react';
import api from '../api';

export default function FinancialStatements({ refreshTrigger }) {
  const [pnl, setPnl] = useState(null);
  const [bs, setBs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Period filter states: 'FY', 'MONTH', 'ALL', 'CUSTOM'
  const [periodPreset, setPeriodPreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper to compute date boundaries
  const computeDateRange = (preset) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    if (preset === 'FY') {
      // Indian Financial Year: April 1 to March 31
      let startYear = currentMonth < 4 ? currentYear - 1 : currentYear;
      let endYear = startYear + 1;
      const start = `${startYear}-04-01`;
      const end = `${endYear}-03-31`;
      return { start, end };
    } else if (preset === 'MONTH') {
      const year = currentYear;
      const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
      const lastDay = new Date(year, currentMonth, 0).getDate();
      const start = `${year}-${monthStr}-01`;
      const end = `${year}-${monthStr}-${lastDay < 10 ? `0${lastDay}` : lastDay}`;
      return { start, end };
    } else if (preset === 'ALL') {
      return { start: '', end: '' };
    }
    return { start: startDate, end: endDate };
  };

  const handlePresetChange = (preset) => {
    setPeriodPreset(preset);
    if (preset !== 'CUSTOM') {
      const { start, end } = computeDateRange(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      let pnlUrl = '/reports/profit-loss';
      let bsUrl = '/reports/balance-sheet';

      const queryParts = [];
      if (startDate) queryParts.push(`startDate=${startDate}`);
      if (endDate) queryParts.push(`endDate=${endDate}`);

      if (queryParts.length > 0) {
        pnlUrl += `?${queryParts.join('&')}`;
      }
      if (endDate) {
        bsUrl += `?asOfDate=${endDate}`;
      }

      const [pnlRes, bsRes] = await Promise.all([
        api.get(pnlUrl),
        api.get(bsUrl),
      ]);
      setPnl(pnlRes.data);
      setBs(bsRes.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch financial statements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [refreshTrigger, startDate, endDate]);

  const handleExportCsv = async () => {
    try {
      let url = '/reports/profit-loss/export-csv';
      const queryParts = [];
      if (startDate) queryParts.push(`startDate=${startDate}`);
      if (endDate) queryParts.push(`endDate=${endDate}`);
      if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileLabel = startDate && endDate ? `${startDate}_to_${endDate}` : 'All_Time';
      link.setAttribute('download', `Profit_and_Loss_Report_${fileLabel}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export CSV', err);
      alert('Unable to generate CSV export. Please ensure the backend is running.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const fmt = (val) =>
    '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isProfit = (val) => parseFloat(val || 0) >= 0;

  return (
    <div className="financial-statements-wrapper">
      
      {/* ── Toolbar: Period Presets & Actions ── */}
      <div className="statements-toolbar card-panel">
        <div className="statements-period-controls">
          <span className="toolbar-section-label">Reporting Period:</span>
          <div className="statements-period-presets">
            <button
              type="button"
              className={`period-preset-btn ${periodPreset === 'ALL' ? 'active' : ''}`}
              onClick={() => handlePresetChange('ALL')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`period-preset-btn ${periodPreset === 'FY' ? 'active' : ''}`}
              onClick={() => handlePresetChange('FY')}
            >
              Active FY (Apr-Mar)
            </button>
            <button
              type="button"
              className={`period-preset-btn ${periodPreset === 'MONTH' ? 'active' : ''}`}
              onClick={() => handlePresetChange('MONTH')}
            >
              This Month
            </button>
            <button
              type="button"
              className={`period-preset-btn ${periodPreset === 'CUSTOM' ? 'active' : ''}`}
              onClick={() => handlePresetChange('CUSTOM')}
            >
              Custom Range
            </button>
          </div>

          {periodPreset === 'CUSTOM' && (
            <div className="statements-custom-dates">
              <div className="date-input-group">
                <label>From:</label>
                <input
                  type="date"
                  className="input-field date-picker"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="date-input-group">
                <label>To:</label>
                <input
                  type="date"
                  className="input-field date-picker"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="statements-actions">
          <button
            type="button"
            className="btn-action-export"
            onClick={handleExportCsv}
            title="Download formatted CSV spreadsheet"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export CSV
          </button>
          <button
            type="button"
            className="btn-action-print"
            onClick={handlePrint}
            title="Print or Save as PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {/* ── Metadata Info Banner ── */}
      {pnl && (
        <div className="statements-meta-banner">
          <div className="meta-badge-group">
            <span className="meta-pill">
              <strong>Period:</strong> {pnl.startDate && pnl.endDate ? `${pnl.startDate} → ${pnl.endDate}` : 'All Recorded History'}
            </span>
            <span className="meta-pill">
              <strong>Cycle:</strong> {pnl.financialYear || 'Active Ledger'}
            </span>
            <span className="meta-pill">
              <strong>Currency:</strong> {pnl.currency || 'INR'} (₹)
            </span>
          </div>
          <div className="meta-timestamp">
            Statement Refreshed: {new Date(pnl.generatedAt || Date.now()).toLocaleTimeString()}
          </div>
        </div>
      )}

      {loading && (
        <div className="report-loading">
          <div className="report-spinner"></div>
          <p>Generating Verified Financial Statements...</p>
        </div>
      )}

      {error && (
        <div className="alert-banner error" style={{ marginTop: '1rem' }}>
          <span>⚠ {error}</span>
        </div>
      )}

      {!loading && pnl && bs && (
        <div className="statements-grid">

          {/* ── Profit & Loss Statement ── */}
          <div className="statement-card">
            <div className="statement-card-header">
              <div className="statement-card-icon pnl-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="statement-card-title">Profit & Loss Statement</h3>
                <p className="statement-card-subtitle">Revenue vs. Expenses → Operational Profitability</p>
              </div>
            </div>

            <div className="statement-section">
              <div className="statement-section-label revenue-label">REVENUES</div>
              {pnl.revenues.length === 0 ? (
                <div className="statement-line" style={{ color: 'var(--text-muted)' }}>No revenue entries in this period</div>
              ) : (
                pnl.revenues.map((row) => (
                  <div className="statement-line" key={row.accountId}>
                    <span className="statement-line-name">{row.accountName}</span>
                    <span className="statement-line-amount revenue-amount">{fmt(row.balance)}</span>
                  </div>
                ))
              )}
              <div className="statement-subtotal">
                <span>Total Revenue</span>
                <span className="revenue-amount">{fmt(pnl.totalRevenue)}</span>
              </div>
            </div>

            <div className="statement-divider"></div>

            <div className="statement-section">
              <div className="statement-section-label expense-label">EXPENSES</div>
              {pnl.expenses.length === 0 ? (
                <div className="statement-line" style={{ color: 'var(--text-muted)' }}>No expense entries in this period</div>
              ) : (
                pnl.expenses.map((row) => (
                  <div className="statement-line" key={row.accountId}>
                    <span className="statement-line-name">{row.accountName}</span>
                    <span className="statement-line-amount expense-amount">{fmt(row.balance)}</span>
                  </div>
                ))
              )}
              <div className="statement-subtotal">
                <span>Total Expenses</span>
                <span className="expense-amount">{fmt(pnl.totalExpenses)}</span>
              </div>
            </div>

            {/* Profitability & Margin Summary */}
            <div className="statement-net-profit">
              <div className={`net-profit-box ${isProfit(pnl.netProfit) ? 'profit' : 'loss'}`}>
                <div>
                  <span className="net-profit-label">{isProfit(pnl.netProfit) ? 'Net Profit' : 'Net Loss'}</span>
                  <span className="net-profit-value">{fmt(pnl.netProfit)}</span>
                </div>
                {pnl.profitMarginPercentage !== undefined && pnl.profitMarginPercentage !== null && (
                  <div className="profit-margin-badge" title="Net Profit / Total Revenue">
                    <span className="margin-label">Margin</span>
                    <span className="margin-value">{pnl.profitMarginPercentage}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Balance Sheet ── */}
          <div className="statement-card">
            <div className="statement-card-header">
              <div className="statement-card-icon bs-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="statement-card-title">Balance Sheet</h3>
                <p className="statement-card-subtitle">Assets = Liabilities + Equity + Retained Profit</p>
              </div>
            </div>

            {/* Left: Assets */}
            <div className="balance-sheet-grid">
              <div>
                <div className="statement-section">
                  <div className="statement-section-label asset-label">ASSETS</div>
                  {bs.assets.map((row) => (
                    <div className="statement-line" key={row.accountId}>
                      <span className="statement-line-name">{row.accountName}</span>
                      <span className="statement-line-amount asset-amount">{fmt(row.balance)}</span>
                    </div>
                  ))}
                  <div className="statement-subtotal">
                    <span>Total Assets</span>
                    <span className="asset-amount">{fmt(bs.totalAssets)}</span>
                  </div>
                </div>
              </div>

              <div>
                {/* Liabilities */}
                <div className="statement-section">
                  <div className="statement-section-label liability-label">LIABILITIES</div>
                  {bs.liabilities.map((row) => (
                    <div className="statement-line" key={row.accountId}>
                      <span className="statement-line-name">{row.accountName}</span>
                      <span className="statement-line-amount liability-amount">{fmt(row.balance)}</span>
                    </div>
                  ))}
                </div>

                {/* Equity */}
                {bs.equities.length > 0 && (
                  <div className="statement-section" style={{ marginTop: '1rem' }}>
                    <div className="statement-section-label equity-label">EQUITY</div>
                    {bs.equities.map((row) => (
                      <div className="statement-line" key={row.accountId}>
                        <span className="statement-line-name">{row.accountName}</span>
                        <span className="statement-line-amount equity-amount">{fmt(row.balance)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Retained Net Profit */}
                <div className="statement-line retained-profit-line">
                  <span className="statement-line-name">Retained Net Profit</span>
                  <span className={`statement-line-amount ${isProfit(bs.netProfit) ? 'revenue-amount' : 'expense-amount'}`}>
                    {fmt(bs.netProfit)}
                  </span>
                </div>

                <div className="statement-subtotal">
                  <span>Total Liabilities + Equity</span>
                  <span className="liability-amount">{fmt(bs.totalLiabilitiesAndEquity)}</span>
                </div>
              </div>
            </div>

            {/* Balance verification footer */}
            <div className={`report-verification-footer ${bs.balanced ? 'verified' : 'unverified'}`} style={{ marginTop: '1.5rem' }}>
              {bs.balanced
                ? `✓ Balance Sheet Equation holds: Assets (${fmt(bs.totalAssets)}) = Liabilities + Equity (${fmt(bs.totalLiabilitiesAndEquity)})`
                : `⚠ Balance Sheet Mismatch: Assets (${fmt(bs.totalAssets)}) ≠ Liabilities + Equity (${fmt(bs.totalLiabilitiesAndEquity)})`
              }
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
