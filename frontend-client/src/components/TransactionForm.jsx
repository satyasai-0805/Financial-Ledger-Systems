import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from './AuthProvider';

export default function TransactionForm({ onTransactionSuccess, cloneData }) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState([
    { accountId: '', type: 'DEBIT', amount: '' },
    { accountId: '', type: 'CREDIT', amount: '' }
  ]);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timestamp, setTimestamp] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now - tzOffset).toISOString().substring(0, 16);
  });

  // Handle transaction cloning/re-use from props
  useEffect(() => {
    if (cloneData && accounts.length > 0) {
      setDescription(cloneData.description);
      const newEntries = cloneData.entries.map(entry => ({
        accountId: entry.account.id.toString(),
        type: entry.type,
        amount: '' // clear amount so user types it fresh
      }));
      setEntries(newEntries);
      
      // Auto-focus the first amount field
      setTimeout(() => {
        const firstAmountInput = document.querySelector('.entry-row:first-of-type input[type="number"]');
        if (firstAmountInput) {
          firstAmountInput.focus();
        }
      }, 100);
    }
  }, [cloneData, accounts]);

  const templates = [
    { label: '🏢 Rent Invoice', desc: 'Monthly Office Rent Invoice' },
    { label: '💸 Pay Rent', desc: 'Rent Payment to Landlord' },
    { label: '🔌 Utility Bill', desc: 'Monthly Utilities Invoice' },
    { label: '💼 Client Invoice', desc: 'Consulting Services Rendered' },
    { label: '💰 Client Payment', desc: 'Client Invoice Payment Received' },
    { label: '📈 Cash Investment', desc: 'Initial Cash Investment' }
  ];

  const handleApplyTemplate = (tpl) => {
    setDescription(tpl.desc);
    
    // Auto-detect and select accounts
    if (accounts.length >= 2) {
      const lowerVal = tpl.desc.toLowerCase();

      const cash = accounts.find(a => a.name.toLowerCase() === 'cash') || accounts[0];
      const ar = accounts.find(a => a.name.toLowerCase() === 'accounts receivable') || accounts[1];
      const ap = accounts.find(a => a.name.toLowerCase() === 'accounts payable') || accounts[2];
      const rev = accounts.find(a => a.name.toLowerCase() === 'revenue') || accounts[3];
      const rent = accounts.find(a => a.name.toLowerCase() === 'rent expense') || accounts[4];
      const util = accounts.find(a => a.name.toLowerCase() === 'utilities expense') || accounts[5];

      let newEntries = [...entries];

      if (lowerVal.includes('rent') && lowerVal.includes('invoice')) {
        newEntries[0] = { ...newEntries[0], accountId: rent.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: ap.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('rent') && (lowerVal.includes('payment') || lowerVal.includes('paid'))) {
        newEntries[0] = { ...newEntries[0], accountId: ap.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: cash.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('rent')) {
        newEntries[0] = { ...newEntries[0], accountId: rent.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: cash.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('utility') || lowerVal.includes('utilities') || lowerVal.includes('electricity') || lowerVal.includes('water') || lowerVal.includes('internet') || lowerVal.includes('power')) {
        newEntries[0] = { ...newEntries[0], accountId: util.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: cash.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('consulting') || lowerVal.includes('service') || lowerVal.includes('bill') || lowerVal.includes('invoice')) {
        newEntries[0] = { ...newEntries[0], accountId: ar.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: rev.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('payment received') || lowerVal.includes('client payment') || lowerVal.includes('received payment') || lowerVal.includes('receipt')) {
        newEntries[0] = { ...newEntries[0], accountId: cash.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: ar.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('investment') || lowerVal.includes('capital') || lowerVal.includes('equity')) {
        newEntries[0] = { ...newEntries[0], accountId: cash.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: rev.id.toString(), type: 'CREDIT' };
      }
      
      setEntries(newEntries);
      
      // Auto-focus the amount field of the first row
      setTimeout(() => {
        const firstAmountInput = document.querySelector('.entry-row:first-of-type input[type="number"]');
        if (firstAmountInput) {
          firstAmountInput.focus();
        }
      }, 50);
    }
  };

  // Live balancing calculator metrics
  const [totalDebits, setTotalDebits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [difference, setDifference] = useState(0);
  const [isBalanced, setIsBalanced] = useState(false);

  // Fetch accounts on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const response = await api.get('/accounts');
        const data = response.data;
        setAccounts(data || []);
        
        // Auto-populate Cash (DEBIT) and Revenue (CREDIT) if they exist
        if (data && data.length >= 2) {
          const cashAcc = data.find(a => a.name.toLowerCase() === 'cash') || data[0];
          const revenueAcc = data.find(a => a.name.toLowerCase() === 'revenue') || data[1];
          setEntries([
            { accountId: cashAcc.id.toString(), type: 'DEBIT', amount: '' },
            { accountId: revenueAcc.id.toString(), type: 'CREDIT', amount: '' }
          ]);
        }
      } catch (err) {
        console.error("Error loading accounts:", err);
        setSubmitError("Failed to load account list. Please check the backend connection.");
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  // Update totals and balance state whenever entries change
  useEffect(() => {
    let debits = 0;
    let credits = 0;

    entries.forEach(entry => {
      const val = parseFloat(entry.amount) || 0;
      if (val > 0) {
        if (entry.type === 'DEBIT') {
          debits += val;
        } else if (entry.type === 'CREDIT') {
          credits += val;
        }
      }
    });

    // Handle floating point precision issues in JS (e.g. 0.1 + 0.2)
    const debitsFixed = Math.round(debits * 100) / 100;
    const creditsFixed = Math.round(credits * 100) / 100;
    const diff = Math.round(Math.abs(debitsFixed - creditsFixed) * 100) / 100;

    setTotalDebits(debitsFixed);
    setTotalCredits(creditsFixed);
    setDifference(diff);
    setIsBalanced(debitsFixed === creditsFixed && debitsFixed > 0);
  }, [entries]);

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    setDescription(val);

    // Auto-detect accounts based on transaction label description keywords
    if (accounts.length >= 2) {
      const lowerVal = val.toLowerCase();

      const cash = accounts.find(a => a.name.toLowerCase() === 'cash') || accounts[0];
      const ar = accounts.find(a => a.name.toLowerCase() === 'accounts receivable') || accounts[1];
      const ap = accounts.find(a => a.name.toLowerCase() === 'accounts payable') || accounts[2];
      const rev = accounts.find(a => a.name.toLowerCase() === 'revenue') || accounts[3];
      const rent = accounts.find(a => a.name.toLowerCase() === 'rent expense') || accounts[4];
      const util = accounts.find(a => a.name.toLowerCase() === 'utilities expense') || accounts[5];

      let newEntries = [...entries];

      if (lowerVal.includes('rent') && lowerVal.includes('invoice')) {
        // Rent Invoice: Debit Rent Expense, Credit Accounts Payable
        newEntries[0] = { ...newEntries[0], accountId: rent.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: ap.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('rent') && (lowerVal.includes('payment') || lowerVal.includes('paid'))) {
        // Rent Payment: Debit Accounts Payable, Credit Cash
        newEntries[0] = { ...newEntries[0], accountId: ap.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: cash.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('rent')) {
        // Generic Rent: Debit Rent Expense, Credit Cash
        newEntries[0] = { ...newEntries[0], accountId: rent.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: cash.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('utility') || lowerVal.includes('utilities') || lowerVal.includes('electricity') || lowerVal.includes('water') || lowerVal.includes('internet') || lowerVal.includes('power')) {
        // Utilities: Debit Utilities Expense, Credit Cash/Accounts Payable
        newEntries[0] = { ...newEntries[0], accountId: util.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: cash.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('consulting') || lowerVal.includes('service') || lowerVal.includes('bill') || lowerVal.includes('invoice')) {
        // Billed client: Debit Accounts Receivable, Credit Revenue
        newEntries[0] = { ...newEntries[0], accountId: ar.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: rev.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('payment received') || lowerVal.includes('client payment') || lowerVal.includes('received payment') || lowerVal.includes('receipt')) {
        // Client paid us: Debit Cash, Credit Accounts Receivable
        newEntries[0] = { ...newEntries[0], accountId: cash.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: ar.id.toString(), type: 'CREDIT' };
      } else if (lowerVal.includes('investment') || lowerVal.includes('capital') || lowerVal.includes('equity')) {
        // Investment: Debit Cash, Credit Revenue
        newEntries[0] = { ...newEntries[0], accountId: cash.id.toString(), type: 'DEBIT' };
        newEntries[1] = { ...newEntries[1], accountId: rev.id.toString(), type: 'CREDIT' };
      }
      
      setEntries(newEntries);
    }
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const addEntryRow = () => {
    // Determine the type for the new row to make it easy for the user
    // If we have more debits than credits, suggest CREDIT; otherwise suggest DEBIT
    const type = totalDebits > totalCredits ? 'CREDIT' : 'DEBIT';
    setEntries([...entries, { accountId: '', type, amount: '' }]);
  };

  const removeEntryRow = (index) => {
    if (entries.length <= 2) {
      setSubmitError("A double-entry transaction must contain at least two rows.");
      return;
    }
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
  };

  const handleAutoBalance = () => {
    if (difference <= 0) return;
    const type = totalDebits > totalCredits ? 'CREDIT' : 'DEBIT';
    
    // Auto-set balancing account: if CREDIT, pre-select Revenue; if DEBIT, pre-select Cash
    let balancingAccountId = '';
    if (accounts.length > 0) {
      const targetName = type === 'CREDIT' ? 'revenue' : 'cash';
      const balancingAcc = accounts.find(a => a.name.toLowerCase() === targetName) || accounts[0];
      balancingAccountId = balancingAcc.id.toString();
    }
    
    setEntries([...entries, { accountId: balancingAccountId, type, amount: difference.toFixed(2) }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    // Frontend validations
    if (!description.trim()) {
      setSubmitError("Please provide a transaction description.");
      return;
    }

    if (entries.some(entry => !entry.accountId)) {
      setSubmitError("Please select an account for all transaction lines.");
      return;
    }

    if (entries.some(entry => !entry.amount || parseFloat(entry.amount) <= 0)) {
      setSubmitError("All journal lines must have a valid positive amount.");
      return;
    }

    if (!isBalanced) {
      setSubmitError(`Transaction is unbalanced. Debits (₹${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) must equal Credits (₹${totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}). Difference: ₹${difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      return;
    }

    setIsSubmitting(true);

    // Transform local form entries to match backend structure
    const payload = {
      description: description,
      timestamp: timestamp ? timestamp + ':00' : null,
      entries: entries.map(entry => ({
        account: { id: parseInt(entry.accountId) },
        type: entry.type,
        amount: parseFloat(entry.amount)
      }))
    };

    try {
      const response = await api.post('/transactions', payload);
      const responseData = response.data;

      setSubmitSuccess(true);
      setDescription('');
      
      // Auto-reset timestamp to current local date/time
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now - tzOffset).toISOString().substring(0, 16);
      setTimestamp(localISO);
      
      // Reset to pre-populated default accounts (Cash as DEBIT, Revenue as CREDIT)
      if (accounts && accounts.length >= 2) {
        const cashAcc = accounts.find(a => a.name.toLowerCase() === 'cash') || accounts[0];
        const revenueAcc = accounts.find(a => a.name.toLowerCase() === 'revenue') || accounts[1];
        setEntries([
          { accountId: cashAcc.id.toString(), type: 'DEBIT', amount: '' },
          { accountId: revenueAcc.id.toString(), type: 'CREDIT', amount: '' }
        ]);
      } else {
        setEntries([
          { accountId: '', type: 'DEBIT', amount: '' },
          { accountId: '', type: 'CREDIT', amount: '' }
        ]);
      }
      
      // Trigger parent component to reload the ledger table
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (err) {
      console.error("Submission failed:", err);
      const errorMessage = err.response && err.response.data && err.response.data.message 
        ? err.response.data.message 
        : err.message || "Failed to submit transaction to backend.";
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role === 'ROLE_VIEWER' || user?.role === 'VIEWER') {
    return null; // Don't render the form for VIEWERS
  }

  return (
    <div className="card-panel">
      <h2 className="card-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        New Balanced Transaction
      </h2>

      {submitError && (
        <div className="alert-banner error">
          <svg className="alert-banner-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>{submitError}</div>
          <button className="alert-banner-close" onClick={() => setSubmitError(null)}>×</button>
        </div>
      )}

      {submitSuccess && (
        <div className="alert-banner success">
          <svg className="alert-banner-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div>Transaction saved and journalized successfully.</div>
          <button className="alert-banner-close" onClick={() => setSubmitSuccess(false)}>×</button>
        </div>
      )}

      <div className="templates-container">
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Quick Templates</label>
        <div className="templates-list">
          {templates.map((tpl, i) => (
            <button
              key={i}
              type="button"
              className="btn-template-chip"
              onClick={() => handleApplyTemplate(tpl)}
              disabled={isSubmitting}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="description">Transaction Label / Narration</label>
          <input
            id="description"
            className="input-field"
            type="text"
            placeholder="e.g. Monthly Internet Bills, Software Purchase, Consulting Invoice"
            value={description}
            onChange={handleDescriptionChange}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="timestamp">Transaction Date & Time (Optional)</label>
          <input
            id="timestamp"
            className="input-field"
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            disabled={isSubmitting}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
            Leave blank to use current server time. Must fall within the active financial year (April 1 to March 31).
          </small>
        </div>

        <div className="entry-rows-container">
          <div className="entry-row-header">
            <span className="entry-row-header-label">Account Name</span>
            <span className="entry-row-header-label">Type</span>
            <span className="entry-row-header-label">Amount (₹)</span>
            <span></span>
          </div>

          {entries.map((entry, index) => (
            <div className="entry-row" key={index}>
              <select
                className="input-field"
                value={entry.accountId}
                onChange={(e) => handleEntryChange(index, 'accountId', e.target.value)}
                disabled={isSubmitting || loadingAccounts}
                aria-label="Account selection"
              >
                <option value="">-- Choose Account --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>

              <select
                className="input-field"
                value={entry.type}
                onChange={(e) => handleEntryChange(index, 'type', e.target.value)}
                disabled={isSubmitting}
                aria-label="Entry type selection"
              >
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>

              <input
                className="input-field"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={entry.amount}
                onChange={(e) => handleEntryChange(index, 'amount', e.target.value)}
                disabled={isSubmitting}
                aria-label="Amount input"
              />

              <button
                type="button"
                className="btn-remove-row"
                onClick={() => removeEntryRow(index)}
                disabled={isSubmitting || entries.length <= 2}
                title="Remove entry line"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}

          <div className="form-actions-row">
            <button
              type="button"
              className="btn-add-row"
              onClick={addEntryRow}
              disabled={isSubmitting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Journal Entry Leg
            </button>

            <button
              type="button"
              className="btn-auto-balance"
              onClick={handleAutoBalance}
              disabled={isSubmitting || difference === 0}
            >
              🪄 Auto-Balance Entry
            </button>
          </div>
        </div>

        {/* Dynamic Balance calculator HUD */}
        <div className="balance-hud">
          <div className="balance-metric">
            <span className="balance-metric-label">Total Debits</span>
            <span className="balance-metric-value debit">₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="balance-metric">
            <span className="balance-metric-label">Total Credits</span>
            <span className="balance-metric-value credit">₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="balance-metric">
            <span className="balance-metric-label">Difference</span>
            <span className="balance-metric-value">₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className={`balance-status-badge ${isBalanced ? 'balanced' : 'unbalanced'}`}>
            {isBalanced ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Balanced
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Unbalanced
              </>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn-submit"
          disabled={isSubmitting || !isBalanced}
        >
          {isSubmitting ? 'Journalizing Transaction...' : 'Post Balanced Transaction'}
        </button>
      </form>
    </div>
  );
}
