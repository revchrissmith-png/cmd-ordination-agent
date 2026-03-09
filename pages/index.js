import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [voices, setVoices] = useState([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false); // NEW: Mic State
  const scrollRef = useRef(null);

  const colors = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff', charcoal: '#040404' };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const speak = (text) => {
    if (!text || !isVoiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const v = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google')) && v.lang.startsWith('en'));
    if (v) utterance.voice = v;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // --- NEW: Microphone Logic ---
  const startListening = () => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support voice input.");
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + " " + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
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
        body: JSON.stringify({ message: currentInput, history: messages }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      speak(data.reply);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Technical error." }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head><title>CMD Mentor</title></Head>

      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="Logo" style={{ height: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>CMD ORDINATION STUDY AGENT</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* NEW: Clean SVG Toggle */}
          <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isVoiceEnabled ? colors.white : '#666'}>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              {!isVoiceEnabled && <line x1="1" y1="1" x2="23" y2="23" stroke={colors.white} strokeWidth="2" />}
            </svg>
          </button>
          
          <button onClick={() => {
            const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `CMD_Transcript.txt`; a.click();
          }} style={{ backgroundColor: colors.allianceBlue, color: colors.white, border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>DOWNLOAD</button>
        </div>
      </header>

      <main style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '4px', height: '65vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && <p style={{ textAlign: 'center', color: colors.allianceBlue, marginTop: '3rem' }}>Ready for your practice session. What theological topic are we exploring?</p>}
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? colors.allianceBlue : colors.cloudGray, color: msg.role === 'user' ? colors.white : colors.charcoal, padding: '0.9rem 1.3rem', borderRadius: '8px', maxWidth: '80%', fontSize: '0.95rem' }}>
                {msg.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: '1.5rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.8rem' }}>
            {/* NEW: Mic Button */}
            <button type="button" onClick={startListening} style={{ background: isListening ? '#ff4d4d' : colors.cloudGray, border: 'none', borderRadius: '4px', width: '45px', cursor: 'pointer', fontSize: '1.2rem' }}>
              {isListening ? '🛑' : '🎤'}
            </button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type or use microphone..." style={{ flex: 1, padding: '0.8rem', border: `1px solid ${colors.allianceBlue}`, borderRadius: '4px' }} />
            <button type="submit" disabled={loading} style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '0 1.5rem', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>SEND</button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: '#999', fontSize: '0.65rem', marginTop: '1rem' }}>Build v1.6.4 | Socratic Logic & Voice Input</p>
      </main>
    </div>
  );
}
