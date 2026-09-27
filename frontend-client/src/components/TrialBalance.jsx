import React, { useState, useEffect } from 'react';
import api from '../api';

export default function TrialBalance({ refreshTrigger }) {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBalances = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/accounts/balances');
      const data = response.data;
      setBalances(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load balances from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [refreshTrigger]);

  const getAccountBalance = (name) => {
    const acc = balances.find(b => b.accountName === name);
    return acc ? acc.balance : 0;
  };

  const getTypeTotalBalance = (type) => {
    return balances
      .filter(b => b.accountType === type)
      .reduce((sum, b) => sum + b.balance, 0);
  };

  const cashBalance = getAccountBalance('Cash');
  const unpaidLiabilities = getAccountBalance('Accounts Payable');
  const totalRevenue = getTypeTotalBalance('REVENUE');
  const totalExpenses = getTypeTotalBalance('EXPENSE');

  const formatCurrency = (val) => {
    return '₹' + parseFloat(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (loading && balances.length === 0) {
    return (
      <div className="dashboard-hud-container" style={{ textAlign: 'center', padding: '1rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Account Balances HUD...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-hud-container">
      {error && <div className="alert-banner error" style={{ marginBottom: '1rem' }}>{error}</div>}
      
      <div className="hud-grid">
        <div className="hud-card cash">
          <div className="hud-card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
              <circle cx="12" cy="12" r="2"></circle>
              <line x1="6" y1="12" x2="6.01" y2="12"></line>
              <line x1="18" y1="12" x2="18.01" y2="12"></line>
            </svg>
          </div>
          <div className="hud-card-info">
            <span className="hud-card-label">Cash Position</span>
            <span className="hud-card-value">{formatCurrency(cashBalance)}</span>
          </div>
        </div>

        <div className="hud-card liabilities">
          <div className="hud-card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="hud-card-info">
            <span className="hud-card-label">Unpaid Liabilities</span>
            <span className="hud-card-value warning">{formatCurrency(unpaidLiabilities)}</span>
          </div>
        </div>

        <div className="hud-card revenue">
          <div className="hud-card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <div className="hud-card-info">
            <span className="hud-card-label">Total Revenue</span>
            <span className="hud-card-value success">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        <div className="hud-card expenses">
          <div className="hud-card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <div className="hud-card-info">
            <span className="hud-card-label">Operating Expenses</span>
            <span className="hud-card-value expense">{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
