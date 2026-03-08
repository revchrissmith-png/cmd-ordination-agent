import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function OrdinationAgent() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const colors = { allianceBlue: '#0077C8', deepSea: '#00426A', white: '#ffffff' };
  const allianceLogo = "https://i.imgur.com/ZHqDQJC.png";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password }) 
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history: messages, userId: session?.user?.id }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection error." }]);
    } finally { setLoading(false); }
  };

  // 1. THE GATE (If no session, show ONLY this)
  if (!session) {
    return (
      <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
          <img src={allianceLogo} alt="Logo" style={{ height: '50px', marginBottom: '1.5rem' }} />
          <h1 style={{ color: colors.deepSea, fontSize: '1.2rem', marginBottom: '2rem' }}>CMD ORDINATION MENTOR</h1>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} style={{ width: '100%', padding: '0.8rem', marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ height: '18px' }} /> Sign in with Google
          </button>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px' }} required />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px' }} required />
            <button type="submit" style={{ backgroundColor: colors.allianceBlue, color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold' }}>{isSignUp ? 'REGISTER' : 'SIGN IN'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: colors.allianceBlue, marginTop: '1.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>{isSignUp ? 'Back to Login' : 'Create an Account'}</button>
        </div>
      </div>
    );
  }

  // 2. THE CHAT (Only shown if session exists)
  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: colors.deepSea, color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={allianceLogo} alt="Logo" style={{ height: '35px' }} />
          <span style={{ fontSize: '0.75rem' }}>{session.user.email}</span>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>LOGOUT</button>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 5px 20px rgba(0,0,0,0.1)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? colors.allianceBlue : '#f2f2f2', color: msg.role === 'user' ? 'white' : '#333', padding: '1rem 1.3rem', borderRadius: '15px', maxWidth: '80%', fontSize: '0.95rem' }}>
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ color: colors.allianceBlue, fontSize: '0.8rem', fontStyle: 'italic' }}>Mentor is typing...</div>}
          </div>
          <div style={{ padding: '1.5rem', borderTop: '1px solid #eee', display: 'flex', gap: '0.8rem' }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendMessage(); }} placeholder="Type answer..." style={{ flex: 1, padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px', minHeight: '45px', resize: 'none' }} />
            <button onClick={handleSendMessage} style={{ backgroundColor: colors.deepSea, color: 'white', padding: '0 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>SEND</button>
          </div>
        </div>
      </main>
    </div>
  );
}
