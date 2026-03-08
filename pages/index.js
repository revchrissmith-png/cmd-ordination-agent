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
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState([]);
  const scrollRef = useRef(null);

  const colors = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff', charcoal: '#040404' };
  const allianceLogo = "https://i.imgur.com/ZHqDQJC.png";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const speak = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const v = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google')) && v.lang.startsWith('en'));
    if (v) utterance.voice = v;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported.");
    const rec = new SpeechRecognition();
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => { setInput(prev => prev + " " + e.results[0][0].transcript); setIsListening(false); };
    rec.start();
  };

  const handleOAuthLogin = async (provider) => {
    await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: window.location.origin }
    });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password }) 
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) alert(error.message);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    
    // 1. Add User Message to State
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentInput, 
          history: messages, 
          userId: session?.user?.id 
        }),
      });
      
      const data = await res.json();
      
      // 2. Explicitly map 'reply' to 'content' to fix empty bubbles
      if (data && data.reply) {
        const assistantMsg = { role: 'assistant', content: data.reply };
        setMessages((prev) => [...prev, assistantMsg]);
        speak(data.reply);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: "The Mentor is thinking deeply but hasn't spoken. Check your API settings." }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = () => {
    const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CMD_Transcript.txt`;
    a.click();
  };

  // -----------------------------------------------------------------
  // VIEW 1: LOGIN SCREEN (Gated)
  // -----------------------------------------------------------------
  if (!session) {
    return (
      <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: colors.white, padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '95%' }}>
          <img src={allianceLogo} alt="CMD Logo" style={{ height: '50px', marginBottom: '1rem' }} />
          <h1 style={{ color: colors.deepSea, fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>CMD ORDINATION MENTOR</h1>
          <button onClick={() => handleOAuthLogin('google')} style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ height: '18px' }} /> Sign in with Google
          </button>
          <div style={{ margin: '1rem 0', color: '#888', fontSize: '0.7rem' }}>— OR EMAIL —</div>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px' }} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px' }} required />
            <button type="submit" style={{ backgroundColor: colors.allianceBlue, color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{isSignUp ? 'REGISTER' : 'SIGN IN'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: colors.allianceBlue, marginTop: '1rem', fontSize: '0.8rem', cursor: 'pointer' }}>{isSignUp ? 'Back to Login' : 'Create an Account'}</button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // VIEW 2: FULL CHAT SCREEN (Only shown when logged in)
  // -----------------------------------------------------------------
  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>CMD Mentor</title></Head>
      
      <header style={{ backgroundColor: colors.deepSea, color: 'white', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={allianceLogo} alt="Alliance Logo" style={{ height: '35px' }} />
          <span style={{ fontSize: '0.7rem', opacity: 0.9 }}>{session.user.email}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={downloadTranscript} style={{ background: colors.allianceBlue, color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}>DOWNLOAD</button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>LOGOUT</button>
        </div>
      </header>

      <main style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '12px', height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 5px 25px rgba(0,0,0,0.1)' }}>
          
          {/* Messages Area */}
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && <div style={{ textAlign: 'center', color: colors.allianceBlue, marginTop: '2rem', fontStyle: 'italic' }}>Session active. What would you like to discuss from the handbook?</div>}
            
            {messages.map((msg, i) => (
              <div key={`msg-${i}`} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                backgroundColor: msg.role === 'user' ? colors.allianceBlue : '#f2f2f2', 
                color: msg.role === 'user' ? 'white' : colors.charcoal, 
                padding: '1rem 1.4rem', 
                borderRadius: '15px', 
                maxWidth: '80%', 
                fontSize: '0.95rem', 
                lineHeight: '1.5' 
              }}>
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ color: colors.allianceBlue, fontSize: '0.8rem', fontStyle: 'italic' }}>Mentor is typing...</div>}
          </div>

          {/* Input Area */}
          <div style={{ padding: '1.2rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.8rem', alignItems: 'flex-end', backgroundColor: '#fafafa', borderRadius: '0 0 12px 12px' }}>
            <button onClick={startListening} style={{ background: isListening ? '#ff4d4d' : '#fff', border: '1px solid #ddd', borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer', fontSize: '1.2rem' }}>
              {isListening ? '🛑' : '🎤'}
            </button>
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendMessage(); }} 
              placeholder="Type your response... (Cmd+Enter to send)" 
              style={{ flex: 1, padding: '1rem', border: '1px solid #ddd', borderRadius: '10px', minHeight: '50px', maxHeight: '150px', resize: 'none', fontSize: '1rem', fontFamily: 'inherit' }} 
            />
            <button onClick={handleSendMessage} disabled={loading} style={{ backgroundColor: colors.deepSea, color: 'white', padding: '0 1.8rem', borderRadius: '10px', height: '50px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>SEND</button>
          </div>

        </div>
      </main>
    </div>
  );
}
