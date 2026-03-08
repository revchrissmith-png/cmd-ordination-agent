import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Official Alliance Canada Brand Palette
  const colors = {
    primaryBlue: '#2b388f', // Alliance Blue
    allianceRed: '#7f1214',  // Alliance Red
    allianceGray: '#939598', // Alliance Gray
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
    if (!input.trim()) return;

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
      const assistantMessage = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save to Supabase for persistence
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('messages').insert([
          { user_id: user.id, role: 'user', content: input },
          { user_id: user.id, role: 'assistant', content: data.reply }
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.bgLight, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Head>
        <title>CMD Ordination Agent</title>
      </Head>

      {/* Alliance Canada Branded Header */}
      <header style={{ backgroundColor: colors.primaryBlue, color: colors.white, padding: '2.5rem 1rem', textAlign: 'center', borderBottom: `5px solid ${colors.allianceRed}` }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', textTransform: 'uppercase' }}>
          Ordination Study Agent
        </h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '1rem', fontWeight: '300', letterSpacing: '1px' }}>
          CANADIAN MIDWEST DISTRICT | THE ALLIANCE CANADA
        </p>
      </header>

      <main style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', height: '65vh', display: 'flex', flexDirection: 'column' }}>
          
          <div ref={scrollRef} style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.allianceGray, marginTop: '4rem' }}>
                <h2 style={{ color: colors.primaryBlue }}>Welcome, Ordinand</h2>
                <p>How can I help you with your ordination requirements or papers today?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? colors.primaryBlue : '#f0f0f0',
                color: msg.role === 'user' ? colors.white : '#333',
                padding: '1rem 1.25rem',
                borderRadius: '2px',
                maxWidth: '85%',
                fontSize: '1rem',
                lineHeight: '1.6',
                borderLeft: msg.role === 'assistant' ? `4px solid ${colors.allianceRed}` : 'none'
              }}>
                {msg.content}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: '1.5rem', borderTop: '1px solid #eee', display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the District Mentor..."
              style={{ flex: 1, padding: '1rem', border: `1px solid #ccc`, borderRadius: '2px' }}
            />
            <button 
              type="submit" 
              style={{ backgroundColor: colors.allianceRed, color: colors.white, padding: '0 2rem', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              SEND
            </button>
          </form>
        </div>
        
        <p style={{ textAlign: 'center', marginTop: '2rem', color: colors.allianceGray, fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} Canadian Midwest District. All rights reserved.
        </p>
      </main>
    </div>
  );
}
