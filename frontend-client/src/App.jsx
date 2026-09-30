import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LedgerTable from './components/LedgerTable';
import TransactionForm from './components/TransactionForm';
import TrialBalance from './components/TrialBalance';
import TrialBalanceSheet from './components/TrialBalanceSheet';
import FinancialStatements from './components/FinancialStatements';
import ChatWidget from './components/ChatWidget';
import Login from './components/Login';
import { AuthProvider, useAuth } from './components/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';

function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('logs');
  const [cloneData, setCloneData] = useState(null);
  const { user, logout } = useAuth();

  const handleTransactionSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const handleTxEvent = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('ledger-transaction-created', handleTxEvent);
    return () => window.removeEventListener('ledger-transaction-created', handleTxEvent);
  }, []);

  return (
    <>
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="app-title">Enterprise Financial Ledger</h1>
            <p className="app-subtitle">
              Real-time double-entry validation system backed by an Oracle-compatibility transactional datastore.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Logged in as <strong style={{ color: 'var(--text-main)' }}>{user?.username}</strong> ({user?.role})</span>
            <button className="tab-btn" onClick={logout} style={{ border: '1px solid var(--border-color)', borderRadius: '4px' }}>Logout</button>
          </div>
        </div>
      </header>

      {/* Account Totals HUD — always visible */}
      <TrialBalance refreshTrigger={refreshTrigger} />

      {/* Navigation Tabs */}
      <nav className="tab-nav" aria-label="Dashboard Navigation">
        <button
          id="tab-logs"
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Ledger Logs
        </button>
        <button
          id="tab-trial"
          className={`tab-btn ${activeTab === 'trial' ? 'active' : ''}`}
          onClick={() => setActiveTab('trial')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Trial Balance
        </button>
        <button
          id="tab-statements"
          className={`tab-btn ${activeTab === 'statements' ? 'active' : ''}`}
          onClick={() => setActiveTab('statements')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          Financial Statements
        </button>
      </nav>

      {/* Tab Panels */}
      <div className="tab-panel">

        {activeTab === 'logs' && (
          <main className="main-grid">
            <section aria-label="Transaction Logs">
              <LedgerTable refreshTrigger={refreshTrigger} onCloneTransaction={setCloneData} />
            </section>
            <section aria-label="New Transaction Entry Form">
              <TransactionForm onTransactionSuccess={handleTransactionSuccess} cloneData={cloneData} />
            </section>
          </main>
        )}

        {activeTab === 'trial' && (
          <section className="card-panel" aria-label="Trial Balance Sheet">
            <TrialBalanceSheet refreshTrigger={refreshTrigger} />
          </section>
        )}

        {activeTab === 'statements' && (
          <section aria-label="Financial Statements">
            <FinancialStatements refreshTrigger={refreshTrigger} />
          </section>
        )}

      </div>
      <ChatWidget onTransactionCreated={handleTransactionSuccess} />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
