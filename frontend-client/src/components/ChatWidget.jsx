import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "👋 Hi! I'm your Ledger AI Assistant. Ask me general questions or anything about your financial data (e.g. 'what is my total expense?', 'explain trial balance').",
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

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputMsg.trim();
    if (!trimmed || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMsg('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat/ask', { message: trimmed });
      const { reply, error } = response.data;

      let aiText = reply;
      if (error) {
        aiText = `⚠️ ${error}`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: aiText || "I couldn't process your request. Please try again.",
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
                  <div className="neon-chat-msg-text">{msg.text}</div>
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

          {/* Input Form */}
          <form className="neon-chat-input-area" onSubmit={handleSend}>
            <input 
              type="text"
              className="neon-chat-input"
              placeholder="Ask AI about ledger data or general topics..."
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
