import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with safety checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Official Alliance Canada Brand Palette
  const colors = {
    allianceBlue: '#0077C8',   // Pantone 3005 C
    oceanBlue: '#006298',      // Pantone 7691 C
    deepSea: '#00426A',        // Pantone 2188 C
    cloudGray: '#EAEAEE',      // Cool Grey 1 C
    white: '#ffffff',
    charcoal: '#040404'        // Black 6 C
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      
      if (data.error) throw new Error(data.error);

      const assistantMessage = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('messages').insert([
          { user_id: session.user.id, role: 'user', content: input },
          { user_id: session.user.id, role: 'assistant', content: data.reply }
        ]);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: `Technical Error: ${error.message}.` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif', color: colors.charcoal }}>
      <Head>
        <title>CMD Ordination Agent</title>
      </Head>

      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '2rem 1rem', textAlign: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 'bold', letterSpacing: '1px' }}>ORDINATION STUDY AGENT</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>CANADIAN MIDWEST DISTRICT | THE ALLIANCE CANADA</p>
      </header>

      <main style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '2px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: '65vh', display: 'flex', flexDirection: 'column' }}>
          
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.oceanBlue, marginTop: '4rem' }}>
                <h2 style={{ fontWeight: 'bold' }}>Welcome, Ordinand</h2>
                <p>How can I assist your study and preparation today?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? colors.allianceBlue : colors.cloudGray,
                color: msg.role === 'user' ? colors.white : colors.charcoal,
                padding: '0.9rem 1.3rem',
                borderRadius: '4px',
                maxWidth: '80%',
                fontSize: '0.95rem'
              }}>
                {msg.content}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: '1.5rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              style={{ flex: 1, padding: '0.8rem', border: `1px solid ${colors.oceanBlue}`, borderRadius: '2px' }}
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ backgroundColor: colors.deepSea, color: colors.white, border: 'none', padding: '0 2rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loading ? '...' : 'SEND'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
