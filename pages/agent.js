import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const colors = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history: messages, userName: "Chris" }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Connection Error." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head>
        <title>CMD STUDY AGENT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header style={{ backgroundColor: colors.deepSea, color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <img src="https://i.imgur.com/ZHqDQJC.png" alt="Logo" style={{ height: '35px', marginRight: '1rem' }} />
        <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>CMD STUDY AGENT</h1>
      </header>

      <main style={{ maxWidth: '800px', margin: '1.5rem auto', padding: '0 10px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '4px', height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && <p style={{ textAlign: 'center', color: colors.allianceBlue }}>Welcome, Chris. Let's practice.</p>}
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? colors.allianceBlue : colors.cloudGray, color: msg.role === 'user' ? 'white' : 'black', padding: '0.9rem 1.1rem', borderRadius: '8px', maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ color: colors.allianceBlue, fontSize: '0.8rem' }}>Agent is reflecting...</div>}
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: '1.2rem', borderTop: `1px solid #EAEAEE`, display: 'flex', gap: '0.6rem' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type answer..." style={{ flex: 1, padding: '0.8rem', border: `1px solid ${colors.allianceBlue}`, borderRadius: '4px', fontSize: '16px' }} />
            <button type="submit" disabled={loading} style={{ backgroundColor: colors.deepSea, color: 'white', padding: '0 1.2rem', fontWeight: 'bold', border: 'none', borderRadius: '4px' }}>SEND</button>
          </form>
        </div>
      </main>
    </div>
  );
}
