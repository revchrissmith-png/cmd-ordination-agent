import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);

  const colors = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff', charcoal: '#040404' };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // --- VOICE LOGIC (SPEECH TO TEXT) ---
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported in this browser.");
    
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + " " + transcript);
      setIsListening(false);
    };
    recognition.start();
  };

  // --- VOICE LOGIC (TEXT TO SPEECH) ---
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for pastoral tone
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
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
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      speak(data.reply); // Read response aloud
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Error connecting to Mentor." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- DOWNLOAD TRANSCRIPT ---
  const downloadTranscript = () => {
    const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CMD_Mentoring_Session_${new Date().toLocaleDateString()}.txt`;
    a.click();
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head><title>CMD Mentor</title></Head>

      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <h1 style={{ margin: 0, fontSize: '1rem' }}>CMD ORDINATION MENTOR</h1>
        <button onClick={downloadTranscript} style={{ background: colors.allianceBlue, color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
          DOWNLOAD SESSION
        </button>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '8px', height: '65vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? colors.allianceBlue : '#f2f2f2', color: msg.role === 'user' ? colors.white : colors.charcoal, padding: '0.8rem 1.2rem', borderRadius: '12px', maxWidth: '85%' }}>
                {msg.content}
              </div>
            ))}
          </div>

          <div style={{ padding: '1.2rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.8rem', alignItems: 'flex-end' }}>
            <button onClick={startListening} style={{ background: isListening ? '#ff4d4d' : '#eee', border: '1px solid #ccc', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer' }}>
              {isListening ? '🛑' : '🎤'}
            </button>
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or speak your answer..."
              style={{ flex: 1, padding: '0.8rem', border: '1px solid #ccc', borderRadius: '8px', minHeight: '45px', maxHeight: '150px', resize: 'none' }}
            />
            <button onClick={handleSendMessage} disabled={loading} style={{ backgroundColor: colors.deepSea, color: 'white', padding: '0 1.5rem', borderRadius: '8px', height: '45px', border: 'none', cursor: 'pointer' }}>
              SEND
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
