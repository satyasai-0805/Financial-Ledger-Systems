import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from './AuthProvider';

export default function LedgerTable({ refreshTrigger, onCloneTransaction }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(5); // Show 5 per page for easier paging test
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/transactions?page=${page}&size=${size}`);
      const data = response.data;
      setTransactions(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError("Failed to fetch transactions from server. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, refreshTrigger]);

  useEffect(() => {
    const handleTxCreated = () => {
      setPage(0);
      fetchTransactions();
    };
    window.addEventListener('ledger-transaction-created', handleTxCreated);
    return () => window.removeEventListener('ledger-transaction-created', handleTxCreated);
  }, []);

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      setPage(prev => prev + 1);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) + ' ' + date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(tx => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const descMatch = tx.description.toLowerCase().includes(term);
    const idMatch = `tx-${tx.id}`.toLowerCase().includes(term) || tx.id.toString().includes(term);
    const accountMatch = tx.entries.some(entry => 
      entry.account.name.toLowerCase().includes(term) ||
      entry.account.type.toLowerCase().includes(term)
    );
    return descMatch || idMatch || accountMatch;
  });

  return (
    <div className="card-panel">
      <h2 className="card-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        Transaction Ledger Logs
      </h2>

      {error && (
        <div className="alert-banner error">
          <svg className="alert-banner-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          <p>Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-secondary)' }}>
          <p>No transactions recorded yet.</p>
        </div>
      ) : (
        <>
          <div className="search-filter-container">
            <div className="search-input-wrapper">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="input-field search-input"
                placeholder="Filter transactions by narration or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear-btn" onClick={() => setSearchTerm('')}>×</button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Transaction Header</th>
                  <th style={{ width: '60%' }}>Journal Entries (Balanced Legs)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                      No transactions match the search query.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div className="tx-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="tx-description">
                            <span className="tx-id-badge">TX-{tx.id}</span>
                            {tx.description}
                          </span>
                          <span className="tx-meta">{formatDate(tx.timestamp)}</span>
                        </div>
                        {onCloneTransaction && user?.role !== 'ROLE_VIEWER' && user?.role !== 'VIEWER' && (
                          <button
                            type="button"
                            className="btn-clone-tx"
                            onClick={() => onCloneTransaction(tx)}
                            title="Re-use this transaction structure"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Use Template
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <table className="legs-table">
                        <tbody>
                          {tx.entries.map((entry) => (
                            <tr key={entry.id}>
                              <td className="account-name-cell" style={{ width: '50%' }}>
                                {entry.account.name}
                                <span className="account-type-pill">{entry.account.type}</span>
                              </td>
                              <td style={{ width: '20%' }}>
                                <span className={`entry-badge ${entry.type.toLowerCase()}`}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className="amount-text debit" style={{ width: '15%' }}>
                                {entry.type === 'DEBIT' ? `₹${parseFloat(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td className="amount-text credit" style={{ width: '15%' }}>
                                {entry.type === 'CREDIT' ? `₹${parseFloat(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>

          <div className="pagination-container">
            <div className="pagination-info">
              Showing page {page + 1} of {totalPages || 1} ({totalElements} total transactions)
            </div>
            <div className="pagination-buttons">
              <button 
                className="btn-page" 
                onClick={handlePrevPage} 
                disabled={page === 0 || loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Previous
              </button>
              <button 
                className="btn-page" 
                onClick={handleNextPage} 
                disabled={page >= totalPages - 1 || loading}
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
