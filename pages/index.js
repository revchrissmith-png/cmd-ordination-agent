import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const colors = {
    allianceBlue: '#0077C8',
    deepSea: '#00426A',
    cloudGray: '#EAEAEE',
    white: '#ffffff',
    charcoal: '#040404'
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Technical error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Allows CMD + Enter or CTRL + Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSendMessage();
    }
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head><title>CMD Mentor</title></Head>

      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1rem', borderBottom: `4px solid ${colors.allianceBlue}`, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>CMD ORDINATION MENTOR</h1>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '8px', height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                backgroundColor: msg.role === 'user' ? colors.allianceBlue : '#f2f2f2', 
                color: msg.role === 'user' ? colors.white : colors.charcoal, 
                padding: '0.9rem 1.2rem', borderRadius: '12px', maxWidth: '85%', fontSize: '0.95rem'
              }}>
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ color: colors.allianceBlue, fontStyle: 'italic', fontSize: '0.85rem' }}>Mentor is reflecting...</div>}
          </div>

          <div style={{ padding: '1.2rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.8rem', alignItems: 'flex-end' }}>
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer here... (Cmd+Enter to send)"
              style={{ 
                flex: 1, 
                padding: '0.8rem', 
                border: `1px solid #ccc`, 
                borderRadius: '8px', 
                fontSize: '1rem', 
                minHeight: '45px', 
                maxHeight: '150px',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button 
              onClick={handleSendMessage}
              disabled={loading} 
              style={{ 
                backgroundColor: colors.deepSea, 
                color: colors.white, 
                padding: '0.8rem 1.5rem', 
                fontWeight: 'bold', 
                border: 'none', 
                cursor: 'pointer', 
                borderRadius: '8px',
                height: '45px'
              }}
            >
              SEND
            </button>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#888', marginTop: '1rem' }}>
          Tip: Use CMD/CTRL + Enter to send longer responses.
        </p>
      </main>
    </div>
  );
}
