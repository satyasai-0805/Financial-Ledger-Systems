import React, { useState, useEffect } from 'react';
import api from '../api';

export default function TrialBalanceSheet({ refreshTrigger }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/reports/trial-balance');
      const data = res.data;
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [refreshTrigger]);

  const fmt = (val) =>
    '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const typeLabel = (type) => {
    const labels = { ASSET: 'Asset', LIABILITY: 'Liability', EQUITY: 'Equity', REVENUE: 'Revenue', EXPENSE: 'Expense' };
    return labels[type] || type;
  };

  if (loading) return (
    <div className="report-loading">
      <div className="report-spinner"></div>
      <p>Generating Trial Balance...</p>
    </div>
  );

  if (error) return (
    <div className="alert-banner error" style={{ marginTop: '1rem' }}>
      <span>⚠ {error}</span>
    </div>
  );

  if (!report) return null;

  return (
    <div className="report-container">
      {/* Header */}
      <div className="report-header">
        <div>
          <h2 className="report-title">Trial Balance</h2>
          <p className="report-subtitle">Net debit/credit balance for all ledger accounts</p>
        </div>
        <div className={`verification-badge ${report.verified ? 'verified' : 'unverified'}`}>
          {report.verified ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Books Structurally Verified
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Trial Balance Mismatch
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="ledger-table report-table">
          <thead>
            <tr>
              <th>Account Name</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ textAlign: 'right' }}>Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.accountId}>
                <td style={{ fontWeight: 600 }}>{row.accountName}</td>
                <td>
                  <span className={`type-chip type-${row.accountType.toLowerCase()}`}>
                    {typeLabel(row.accountType)}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className={row.debit > 0 ? 'amount-text debit' : 'amount-muted'}>
                    {row.debit > 0 ? fmt(row.debit) : '—'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className={row.credit > 0 ? 'amount-text credit' : 'amount-muted'}>
                    {row.credit > 0 ? fmt(row.credit) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="report-totals-row">
              <td colSpan="2" style={{ fontWeight: 700, fontFamily: 'var(--font-family-title)' }}>TOTAL</td>
              <td style={{ textAlign: 'right' }}>
                <span className="amount-text debit total-amount">{fmt(report.totalDebits)}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="amount-text credit total-amount">{fmt(report.totalCredits)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Verification Footer */}
      <div className={`report-verification-footer ${report.verified ? 'verified' : 'unverified'}`}>
        {report.verified
          ? `✓ Total Debits (${fmt(report.totalDebits)}) = Total Credits (${fmt(report.totalCredits)}) — The books balance perfectly.`
          : `⚠ Imbalance detected: Debits (${fmt(report.totalDebits)}) ≠ Credits (${fmt(report.totalCredits)}). Difference: ${fmt(Math.abs(report.totalDebits - report.totalCredits))}`
        }
      </div>
    </div>
  );
}
