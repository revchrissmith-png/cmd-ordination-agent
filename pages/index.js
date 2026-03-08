import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Official Alliance Palette
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
    e.preventDefault();
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
      if (!response.ok) throw new Error(data.error || "Server Error");

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: colors.charcoal }}>
      <Head><title>CMD Ordination Study Agent</title></Head>

      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <img src="https://i.imgur.com/ZHqDQJC.png" alt="Logo" style={{ height: '40px' }} />
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>CMD ORDINATION STUDY AGENT</h1>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '4px', height: '65vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && <p style={{ textAlign: 'center', color: colors.deepSea, marginTop: '2rem' }}>Welcome. Ask the Mentor a question about the CMD Handbook.</p>}
            
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                backgroundColor: msg.role === 'user' ? colors.allianceBlue : '#f0f0f0', 
                color: msg.role === 'user' ? colors.white : colors.charcoal, 
                padding: '0.9rem 1.2rem', 
                borderRadius: '8px', 
                maxWidth: '85%',
                fontSize: '0.95rem',
                lineHeight: '1.4',
                border: msg.role === 'assistant' ? '1px solid #ddd' : 'none'
              }}>
                {msg.content}
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: '#f0f0f0', padding: '0.9rem 1.2rem', borderRadius: '8px', fontStyle: 'italic', color: colors.oceanBlue }}>
                Mentor is thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: '1.2rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.8rem' }}>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Type your question..." 
              style={{ flex: 1, padding: '0.8rem', border: `1px solid ${colors.allianceBlue}`, borderRadius: '4px', fontSize: '1rem' }} 
            />
            <button 
              type="submit" 
              disabled={loading} 
              style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '0 1.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              SEND
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
