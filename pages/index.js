import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function OrdinationAgent() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
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
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const pastoralVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google US English')) && v.lang.startsWith('en'));
    if (pastoralVoice) utterance.voice = pastoralVoice;
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support Speech Recognition.");
    const rec = new SpeechRecognition();
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => { 
      setInput(prev => prev + " " + e.results[0][0].transcript); 
      setIsListening(false); 
    };
    rec.start();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ 
      email, 
      options: { emailRedirectTo: window.location.origin } 
    });
    if (error) alert(error.message);
    else alert("Success! Check your email for the login link.");
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input, 
          history: messages,
          userId: session.user.id
        }),
      });
      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, assistantMsg]);
      speak(data.reply);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to Mentor." }]);
    } finally { setLoading(false); }
  };

  const downloadTranscript = () => {
    const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CMD_Transcript_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
  };

  if (authLoading) return <div style={{ padding: '5rem', textAlign: 'center' }}>Authenticating District Session...</div>;

  // --- LOGIN VIEW ---
  if (!session) {
    return (
      <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: colors.white, padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="Alliance Logo" style={{ height: '60px', marginBottom: '1.5rem' }} />
          <h1 style={{ color: colors.deepSea, fontSize: '1.2rem', marginBottom: '1rem' }}>CMD ORDINATION MENTOR</h1>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '2rem' }}>Login with your district email to continue your journey.</p>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '8px' }} required />
            <button type="submit" style={{ backgroundColor: colors.allianceBlue, color: 'white', border: 'none', width: '100%', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>LOGIN</button>
          </form>
        </div>
      </div>
    );
  }

  // --- CHAT VIEW ---
  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>CMD Mentor</title></Head>
      
      <header style={{ backgroundColor: colors.deepSea, color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="Logo" style={{ height: '35px' }} />
          <h1 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{session.user.email}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={downloadTranscript} style={{ background: colors.allianceBlue, color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}>DOWNLOAD</button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>LOGOUT</button>
        </div>
      </header>

      <main style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '12px', height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && <div style={{ textAlign: 'center', color: colors.allianceBlue, marginTop: '2rem' }}>Welcome to your practice session. How can I help you prepare today?</div>}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                backgroundColor: msg.role === 'user' ? colors.allianceBlue : '#f2f2f2', 
                color: msg.role === 'user' ? 'white' : colors.charcoal, 
                padding: '1rem 1.4rem', 
                borderRadius: '15px', 
                maxWidth: '80%', 
                fontSize: '0.95rem',
                lineHeight: '1.5',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
              }}>
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ color: colors.allianceBlue, fontStyle: 'italic', fontSize: '0.8rem' }}>Mentor is discerning...</div>}
          </div>

          <div style={{ padding: '1.5rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.8rem', alignItems: 'flex-end', backgroundColor: '#fafafa', borderRadius: '0 0 12px 12px' }}>
            <button onClick={startListening} style={{ background: isListening ? '#ff4d4d' : '#fff', border: '1px solid #ddd', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              {isListening ? '🛑' : '🎤'}
            </button>
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendMessage(); }}
              placeholder="Your response... (Cmd+Enter to send)" 
              style={{ flex: 1, padding: '1rem', border: '1px solid #ddd', borderRadius: '10px', minHeight: '50px', maxHeight: '150px', resize: 'none', fontSize: '1rem', fontFamily: 'inherit' }} 
            />
            <button onClick={handleSendMessage} disabled={loading} style={{ backgroundColor: colors.deepSea, color: 'white', padding: '0 1.8rem', borderRadius: '10px', height: '50px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>SEND</button>
          </div>
        </div>
      </main>
    </div>
  );
}
