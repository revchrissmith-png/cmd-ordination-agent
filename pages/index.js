import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const scrollRef = useRef(null);

  const colors = {
    allianceBlue: '#0077C8',
    deepSea: '#00426A',
    cloudGray: '#EAEAEE',
    white: '#ffffff',
    charcoal: '#040404'
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    return () => subscription.unsubscribe();
  }, [messages]);

  const handleLogin = async () => {
    const email = prompt("Enter your district email:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ 
      email, 
      options: { emailRedirectTo: window.location.origin + '/admin' } 
    });
    if (error) alert(error.message);
    else alert("Success! Check your email for the login link.");
  };

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
      setMessages((prev) => [...prev, { role: 'assistant', content: `Technical Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head><title>CMD Ordination Study Agent</title></Head>

      <header style={{ 
        backgroundColor: colors.deepSea, 
        color: colors.white, 
        padding: '1rem 2rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: `4px solid ${colors.allianceBlue}` 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="Alliance Logo" style={{ height: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>CMD ORDINATION STUDY AGENT</h1>
        </div>
        <button 
          onClick={user ? () => supabase.auth.signOut() : handleLogin}
          style={{ 
            backgroundColor: 'transparent', 
            color: colors.white, 
            border: `1px solid ${colors.white}`, 
            padding: '0.5rem 1rem', 
            fontSize: '0.75rem', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            borderRadius: '2px'
          }}
        >
          {user ? 'LOGOUT' : 'ADMIN LOGIN'}
        </button>
      </header>

      <main style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '4px', height: '65vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && <p style={{ textAlign: 'center', color: colors.oceanBlue, marginTop: '4rem' }}>Welcome to the CMD Mentor. Ask your first question below.</p>}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                backgroundColor: msg.role === 'user' ? colors.allianceBlue : colors.cloudGray, 
                color: msg.role === 'user' ? colors.white : colors.charcoal, 
                padding: '0.9rem 1.3rem', 
                borderRadius: '8px', 
                maxWidth: '80%',
                fontSize: '0.95rem',
                lineHeight: '1.5'
              }}>
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ color: colors.oceanBlue, fontStyle: 'italic', fontSize: '0.85rem' }}>Mentor is thinking...</div>}
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: '1.5rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Type your question..." 
              style={{ flex: 1, padding: '0.8rem', border: `1px solid ${colors.allianceBlue}`, borderRadius: '4px' }} 
            />
            <button 
              type="submit" 
              disabled={loading} 
              style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '0 2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              SEND
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
