import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

const ChatWidget = ({ onTransactionCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "👋 Hi! I'm your Ledger AI Assistant. You can ask questions about your financial books or **record new transactions directly** in chat!\n\nTry saying: *\"Paid 5000 for office rent from cash\"* or *\"Received 12000 cash for consulting services\"*.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const messageToSend = textOverride || inputMsg;
    const trimmed = messageToSend.trim();
    if (!trimmed || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textOverride) setInputMsg('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat/ask', { message: trimmed });
      const { reply, error, transactionCreated, transactionId } = response.data;

      let aiText = reply;
      if (error) {
        aiText = `⚠️ ${error}`;
      }

      // If a transaction was recorded and posted by the AI
      if (transactionCreated) {
        window.dispatchEvent(new CustomEvent('ledger-transaction-created', {
          detail: { transactionId }
        }));
        if (onTransactionCreated) {
          onTransactionCreated();
        }
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: aiText || "I couldn't process your request. Please try again.",
          isTransaction: Boolean(transactionCreated),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      let errorMsg = "Unable to connect to AI assistant service.";
      if (err.response && err.response.data && err.response.data.error) {
        errorMsg = err.response.data.error;
      } else if (err.response && err.response.status === 429) {
        errorMsg = "Rate limit reached (max 10 questions/min). Please wait a moment.";
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `⚠️ ${errorMsg}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickSuggestions = [
    "Add transaction log: Paid 5000 for office rent from cash",
    "Log transaction: Received 12000 cash for consulting",
    "Show transaction logs",
    "Bought stationery for 800 with cash"
  ];

  const renderMessageContent = (text, isTransaction) => {
    if (!text) return null;
    return (
      <div className={`neon-chat-msg-text ${isTransaction ? 'tx-card-highlight' : ''}`}>
        {isTransaction && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '0.7rem',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '12px',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <span>●</span> Live Ledger Recorded
          </div>
        )}
        {text.split('\n').map((line, idx) => {
          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
          const isCheck = line.includes('✅');
          const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);

          return (
            <div key={idx} style={{ 
              marginBottom: line.trim() === '' ? '0.4rem' : '0.15rem',
              paddingLeft: isBullet ? '0.4rem' : '0',
              fontWeight: isCheck ? '600' : 'normal',
              color: isCheck ? '#10b981' : 'inherit'
            }}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <em key={pIdx}>{part.slice(1, -1)}</em>;
                }
                return part;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="neon-chat-container">
      {/* Expanded Chat Popup Window */}
      {isOpen && (
        <div className="neon-chat-window">
          {/* Header */}
          <div className="neon-chat-header">
            <div className="neon-chat-header-info">
              <div className="neon-chat-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
                  <rect x="4" y="8" width="16" height="12" rx="2"></rect>
                  <circle cx="9" cy="13" r="1"></circle>
                  <circle cx="15" cy="13" r="1"></circle>
                  <line x1="9" y1="17" x2="15" y2="17"></line>
                </svg>
              </div>
              <div>
                <h4 className="neon-chat-title">LEDGER AI ASSISTANT</h4>
                <div className="neon-chat-status">
                  <span className="neon-chat-status-dot"></span>
                  <span>ONLINE // FINANCIAL AI</span>
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="neon-chat-close-btn"
              onClick={() => setIsOpen(false)}
              title="Close Chat"
            >
              &times;
            </button>
          </div>

          {/* Messages List Area */}
          <div className="neon-chat-messages">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`neon-chat-msg-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}
              >
                <div className={`neon-chat-msg-bubble ${msg.sender === 'user' ? 'neon-msg-user' : 'neon-msg-ai'}`}>
                  {renderMessageContent(msg.text, msg.isTransaction)}
                  <div className="neon-chat-msg-time">{msg.time}</div>
                </div>
              </div>
            ))}

            {/* Typing Dots Loading Indicator */}
            {isLoading && (
              <div className="neon-chat-msg-row ai-row">
                <div className="neon-chat-msg-bubble neon-msg-ai neon-typing-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            padding: '6px 12px',
            background: 'var(--bg-surface, #121826)',
            borderTop: '1px solid var(--border-color, #1e293b)',
            scrollbarWidth: 'none'
          }}>
            {quickSuggestions.map((prompt, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleSend(null, prompt)}
                disabled={isLoading}
                style={{
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)'}
              >
                ⚡ {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form className="neon-chat-input-area" onSubmit={handleSend}>
            <input 
              type="text"
              className="neon-chat-input"
              placeholder="e.g. Paid 5000 for office rent from cash..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="neon-chat-send-btn"
              disabled={isLoading || !inputMsg.trim()}
              title="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        type="button" 
        className={`neon-chat-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
