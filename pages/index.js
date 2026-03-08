import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
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

  const colors = { 
    allianceBlue: '#0077C8', 
    deepSea: '#00426A', 
    white: '#ffffff', 
    lightGray: '#f4f4f9',
    text: '#333' 
  };
  const logoUrl = "https://i.imgur.com/ZHqDQJC.png";

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Logout Function (Force Refresh)
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Hard reset to login screen
  };

  // Google Login
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  // Email/Password Login
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password }) 
      : await supabase.auth.signInWithPassword({ email, password });
    
    if (error) alert(error.message);
    setLoading(false);
  };

  // Chat Logic
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const userText = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText, 
          history: messages,
          userId: session?.user?.id 
        }),
      });

      const data = await response.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: String(data.reply) }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Error: No response from Mentor." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Network error. Check connection." }]);
    } finally {
      setLoading(true);
      setLoading(false);
    }
  };

  // --- VIEW 1: LOGIN ---
  if (!session) {
    return (
      <div style={{ backgroundColor: '#EAEAEE', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', width: '350px' }}>
          <img src={logoUrl} alt="CMD Logo" style={{ height: '50px', marginBottom: '20px' }} />
          <h2 style={{ fontSize: '1.1rem', color: colors.deepSea }}>CMD MENTOR LOGIN</h2>
          <button onClick={loginWithGoogle} style={{ width: '100%', padding: '10px', margin: '20px 0', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Sign in with Google
          </button>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '20px' }}>— OR —</div>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required />
            <button type="submit" style={{ padding: '10px', backgroundColor: colors.allianceBlue, color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
              {isSignUp ? 'REGISTER' : 'SIGN IN'}
            </button>
          </form>
          <p onClick={() => setIsSignUp(!isSignUp)} style={{ fontSize: '0.8rem', color: colors.allianceBlue, marginTop: '20px', cursor: 'pointer' }}>
            {isSignUp ? 'Already have an account? Login' : 'New? Create an account'}
          </p>
        </div>
      </div>
    );
  }

  // --- VIEW 2: CHAT ---
  return (
    <div style={{ backgroundColor: '#EAEAEE', minHeight: '100vh', fontFamily: 'Arial' }}>
      <Head><title>CMD Mentor</title></Head>
      
      {/* HEADER */}
      <header style={{ backgroundColor: colors.deepSea, color: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoUrl} alt="Logo" style={{ height: '30px' }} />
          <span style={{ fontSize: '0.8rem' }}>{session.user.email}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => {
            const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'transcript.txt';
            a.click();
          }} style={{ background: colors.allianceBlue, color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>DOWNLOAD</button>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '5px 15px', borderRadius: '4px', fontSize: '0.7rem' }}>LOGOUT</button>
        </div>
      </header>

      {/* CHAT BODY */}
      <main style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ backgroundColor: 'white', height: '70vh', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && <p style={{ textAlign: 'center', color: colors.allianceBlue }}>Welcome. Ready to practice for your interview?</p>}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                backgroundColor: msg.role === 'user' ? colors.allianceBlue : '#eee', 
                color: msg.role === 'user' ? 'white' : '#333', 
                padding: '12px 18px', borderRadius: '12px', maxWidth: '80%', fontSize: '0.9rem' 
              }}>
                {msg.content}
              </div>
            ))}
            {loading && <p style={{ fontSize: '0.8rem', color: colors.allianceBlue }}>Mentor is thinking...</p>}
          </div>

          <div style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type your answer..." 
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', resize: 'none', height: '50px' }} 
            />
            <button onClick={sendMessage} style={{ backgroundColor: colors.deepSea, color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold' }}>SEND</button>
          </div>
        </div>
      </main>
    </div>
  );
}
