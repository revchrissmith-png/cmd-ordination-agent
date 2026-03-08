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

  const colors = {
    primaryBlue: '#2b388f',
    allianceRed: '#7f1214',
    allianceGray: '#939598',
    white: '#ffffff',
    bgLight: '#f4f4f4'
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

      // Fixed: Ensure 'assistant' is a string
      const assistantMessage = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save to Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('messages').insert([
          { user_id: session.user.id, role: 'user', content: input },
          { user_id: session.user.id, role: 'assistant', content: data.reply }
        ]);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error connecting to the Mentor. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.bgLight, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Head>
        <title>CMD Ordination Agent</title>
      </Head>

      <header style={{ backgroundColor: colors.primaryBlue, color: colors.white, padding: '2rem 1rem', textAlign: 'center', borderBottom: `5px solid ${colors.allianceRed}` }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>ORDINATION STUDY AGENT</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', opacity: 0.9 }}>MIDWEST DISTRICT | THE ALLIANCE CANADA</p>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', height: '60vh', display: 'flex', flexDirection: 'column' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.allianceGray, marginTop: '3rem' }}>
                <p>Welcome. How can I assist your ordination journey today?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? colors.primaryBlue : '#eee',
                color: msg.role === 'user' ? colors.white : '#333',
                padding: '0.8rem 1.2rem',
                borderRadius: '4px',
                maxWidth: '80%'
              }}>
                {msg.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              style={{ flex: 1, padding: '0.7rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button type="submit" disabled={loading} style={{ backgroundColor: colors.allianceRed, color: colors.white, border: 'none', padding: '0 1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
              {loading ? '...' : 'SEND'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
