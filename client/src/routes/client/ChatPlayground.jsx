import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Info } from 'lucide-react';

export default function ChatPlayground({ selectedTenant, selectedBot, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (selectedBot) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Welcome to our Support Desk. I am an automated assistant configured for ${selectedTenant?.name || 'our company'}. How can I help you today?`,
          timestamp: new Date()
        }
      ]);
    } else {
      setMessages([]);
    }
  }, [selectedBot, selectedTenant]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!selectedBot) {
    return (
      <div className="border border-iso-border rounded-sm p-12 text-center bg-iso-cardBg max-w-xl mx-auto mt-12">
        <p className="text-xs text-iso-textMuted font-mono">Select an active chatbot deployment to load the playground.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/client/bots/${selectedBot._id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-reply',
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(data.timestamp)
        }]);
      } else {
        showToast('System response failed.', 'error');
      }
    } catch (err) {
      showToast('Network error connecting to client gateway.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-6 flex flex-col gap-4">
      
      {/* Informative Header card */}
      <div className="bg-iso-accentLight/30 border border-iso-accent/30 rounded-sm p-4 flex gap-3 text-xs leading-relaxed text-iso-text">
        <Info size={16} className="text-iso-accent shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Client Embed Simulator:</span> This interface mimics how customer-facing chat containers render on external tenant subdomains. It uses the API route: <code className="bg-iso-bgSecondary px-1.5 py-0.5 rounded font-mono">/api/client/bots/:id/chat</code>.
        </div>
      </div>

      {/* Main chat interface card */}
      <div className="bg-iso-cardBg border border-iso-border rounded-sm flex flex-col h-[500px] shadow-sm">
        
        {/* Header */}
        <div className="p-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-iso-primary leading-tight uppercase font-mono tracking-wider">{selectedBot.name}</span>
            <span className="text-[9px] text-iso-textMuted font-mono">POWERED BY {selectedBot.model.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono px-1.5 py-0.5 bg-iso-bgSecondary border border-iso-border text-iso-textMuted rounded-sm uppercase">Secure Channel</span>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 font-sans text-xs">
          {messages.map(msg => (
            <div key={msg.id} className={`flex max-w-[85%] flex-col ${
              msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}>
              <div className={`p-3 border rounded-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-iso-bgSecondary border-iso-border text-iso-text'
                  : 'bg-iso-cardBg border-iso-border text-iso-primary'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              <span className="text-[8px] font-mono text-iso-textMuted mt-1 px-1">
                {msg.role === 'user' ? 'CUSTOMER' : 'SUPPORT'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          
          {loading && (
            <div className="mr-auto max-w-[85%] flex items-center gap-2 bg-iso-bgSecondary/20 border border-iso-border/60 p-3 rounded-sm">
              <Loader2 size={12} className="animate-spin text-iso-accent" />
              <span className="text-[9px] text-iso-textMuted font-mono italic">Support assistant typing...</span>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-iso-border bg-iso-bgSecondary/20 flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading || selectedBot.status !== 'active'}
            className="flex-1 bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded-sm px-3.5 py-2 text-xs text-iso-text outline-none"
          />
          <button
            type="submit"
            disabled={loading || selectedBot.status !== 'active' || !input.trim()}
            className="px-3 bg-iso-primary hover:bg-iso-primaryLight text-white disabled:opacity-40 rounded-sm border border-iso-primary transition-all flex items-center justify-center"
          >
            <Send size={12} />
          </button>
        </form>
      </div>

    </div>
  );
}
