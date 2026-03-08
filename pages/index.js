import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Styling Constants based on Alliance Brand Guidelines
  const colors = {
    primaryBlue: '#2b388f',
    allianceRed: '#7f1214',
    allianceGray: '#939598',
    white: '#ffffff',
    bgLight: '#f8f9fa'
  };

  useEffect(() => {
    // Scroll to bottom when messages update
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 1. Save User Message to Supabase (Persistence)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('messages').insert([
          { user_id: user.id, role: 'user', content: input }
        ]);
      }

      // 2. Call AI API Route 
      // Note: This assumes your API handles the CMD Mentor System Prompt
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          history: messages 
        }),
      });

      const data = await response.json();
      const assistantMessage = { role: 'assistant', content: data.reply };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // 3. Save AI Response to Supabase
      if (user) {
        await supabase.from('messages').insert([
          { user_id: user.id, role: 'assistant', content: data.reply }
        ]);
      }
    } catch (error) {
      console.error("Error communicating with the agent:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.bgLight, minHeight: '100vh', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <Head>
        <title>CMD Ordination Study Agent</title>
      </Head>

      {/* Official Header */}
      <header style={{ backgroundColor: colors.primaryBlue, color: colors.white, padding: '2rem 1rem', textAlign: 'center', borderBottom: `4px solid ${colors.allianceRed}` }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '0.025em' }}>
          ORDINATION STUDY AGENT
        </h1>
        <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '0.9rem', textTransform: 'uppercase' }}>
          Canadian Midwest District | The Alliance Canada
        </p>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '60vh' }}>
          
          {/* Chat Window */}
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.allianceGray, marginTop: '2rem' }}>
                <p>Welcome, Ordinand. I am here to assist you in preparing for your interview and papers using the CMD Ordination Handbook.</p>
                <p style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>Try asking: "What are the requirements for the Divine Healing paper?"</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? colors.primaryBlue : '#e9ecef',
                color: msg.role === 'user' ? colors.white : '#212529',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                maxWidth: '80%',
                fontSize: '0.95rem',
                lineHeight: '1.5'
              }}>
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ color: colors.allianceGray, fontSize: '0.8rem' }}>The Mentor is thinking...</div>}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid #dee2e6', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about ordination..."
              style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: `1px solid ${colors.allianceGray}`, outline: 'none' }}
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                backgroundColor: colors.allianceRed, 
                color: colors.white, 
                padding: '0.75rem 1.5rem', 
                borderRadius: '4px', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              SEND
            </button>
          </form>
        </div>
        
        <footer style={{ marginTop: '1.5rem', textAlign: 'center', color: colors.allianceGray, fontSize: '0.75rem' }}>
          <p>© {new Date().getFullYear()} Canadian Midwest District of The Christian and Missionary Alliance in Canada.</p>
        </footer>
      </main>
    </div>
  );
}
