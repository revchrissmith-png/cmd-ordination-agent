import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const scrollRef = useRef(null);

  const colors = { allianceBlue: '#0077C8', deepSea: '#00426A', white: '#ffffff', cloudGray: '#EAEAEE' };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const getUserName = () => {
    if (!session?.user) return null;
    const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
    return name ? name.split(' ')[0] : session.user.email.split('@')[0];
  };

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
        body: JSON.stringify({ 
          message: currentInput, 
          history: messages,
          userName: getUserName() 
        }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Technical error." }]);
    } finally { setLoading(false); }
  };

  // --- LOGIN VIEW ---
  if (!session) {
    return (
      <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="Logo" style={{ height: '50px', marginBottom: '1.5rem' }} />
          <h1 style={{ color: colors.deepSea, fontSize: '1.2rem', marginBottom: '2rem', fontWeight: 'bold' }}>CMD STUDY AGENT</h1>
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
            style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ height: '18px' }} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // --- CHAT VIEW ---
  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head>
        <title>CMD Study Agent</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header style={{ backgroundColor: colors.deepSea, color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="Logo" style={{ height: '35px' }} />
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>CMD STUDY AGENT</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => {
            const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `CMD_Transcript.txt`; a.click();
          }} style={{ backgroundColor: colors.allianceBlue, color: 'white', border: 'none', padding: '0.4rem 0.7rem', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>DOWNLOAD</button>
          <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '0.4rem 0.7rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>LOGOUT</button>
        </div>
      </header>

      <main style={{ maxWidth: '850px', margin: '1.5rem auto', padding: '0 0.5rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '4px', height: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: colors.allianceBlue, marginTop: '2rem' }}>
                Welcome, {getUserName() || 'Candidate'}. What theological or policy topic should we practice today?
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? colors.allianceBlue : colors.cloudGray, color: msg.role === 'user' ? 'white' : '#040404', padding: '0.9rem 1.1rem', borderRadius: '8px', maxWidth: '88%', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ color: colors.allianceBlue, fontStyle: 'italic', fontSize: '0.8rem' }}>Agent is reflecting...</div>}
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: '1.2rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.6rem' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type answer..." style={{ flex: 1, padding: '0.8rem', border: `1px solid ${colors.allianceBlue}`, borderRadius: '4px', fontSize: '16px' }} />
            <button type="submit" disabled={loading} style={{ backgroundColor: colors.deepSea, color: 'white', padding: '0 1.2rem', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>SEND</button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: '#999', fontSize: '0.6rem', marginTop: '0.8rem' }}>Build v1.7.2 | User: {getUserName() || 'Candidate'}</p>
      </main>
    </div>
  );
}
