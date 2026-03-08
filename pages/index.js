import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
  const logoUrl = "https://i.imgur.com/ZHqDQJC.png";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password }) 
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const textToSend = input;
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, history: messages, userId: session?.user?.id }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: String(data.reply) }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not reach the Mentor." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- GATE: LOGIN ---
  if (!session) {
    return (
      <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', width: '360px' }}>
          <img src={logoUrl} alt="Logo" style={{ height: '50px', marginBottom: '20px' }} />
          <h2 style={{ color: colors.deepSea, marginBottom: '20px' }}>CMD MENTOR v1.5.0</h2>
          
          <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ height: '18px' }} />
            Sign in with Google
          </button>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="email" placeholder="Any Email Address" onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required />
            <button type="submit" style={{ padding: '10px', backgroundColor: colors.allianceBlue, color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
              {isSignUp ? 'REGISTER' : 'SIGN IN'}
            </button>
          </form>
          <p onClick={() => setIsSignUp(!isSignUp)} style={{ color: colors.allianceBlue, cursor: 'pointer', marginTop: '20px', fontSize: '0.8rem' }}>
            {isSignUp ? "Already have an account? Sign In" : "Need a password? Register Here"}
          </p>
        </div>
      </div>
    );
  }

  // --- VIEW: CHAT ---
  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: colors.deepSea, color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src={logoUrl} alt="Logo" style={{ height: '30px' }} />
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' }}>LOGOUT</button>
      </header>
      <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ backgroundColor: 'white', height: '65vh', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: m.role === 'user' ? colors.allianceBlue : '#eef', color: m.role === 'user' ? 'white' : '#333', padding: '10px 15px', borderRadius: '12px', maxWidth: '80%' }}>
                {m.content}
              </div>
            ))}
          </div>
          <div style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type answer..." style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
            <button onClick={handleSendMessage} style={{ backgroundColor: colors.deepSea, color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', fontWeight: 'bold' }}>SEND</button>
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#999', fontSize: '0.7rem', marginTop: '20px' }}>Build v1.5.0 | Session: {session.user.email}</p>
      </main>
    </div>
  );
}
