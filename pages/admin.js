import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [reportData, setReportData] = useState([]);
  const [handbookText, setHandbookText] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = {
    deepSea: '#00426A', oceanBlue: '#006298', allianceBlue: '#0077C8',
    cloudGray: '#EAEAEE', white: '#ffffff', charcoal: '#040404'
  };

  const ADMIN_EMAIL = 'Chris@canadianmidwest.ca';

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === ADMIN_EMAIL) {
      setAuthorized(true);
      fetchData();
    } else {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: report } = await supabase.from('district_activity_report').select('*');
    const { data: knowledge } = await supabase.from('district_knowledge').select('content').eq('id', 'cmd_handbook').single();
    setReportData(report || []);
    setHandbookText(knowledge?.content || '');
    setLoading(false);
  };

  const saveKnowledge = async () => {
    setSaving(true);
    await supabase.from('district_knowledge').upsert({ id: 'cmd_handbook', content: handbookText, document_name: 'CMD Ordination Handbook' });
    setSaving(false);
    alert("District Knowledge Base Updated!");
  };

  if (!authorized && !loading) return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
      <div style={{ background: colors.white, padding: '2rem', borderTop: `5px solid ${colors.deepSea}` }}>
        <h2>Restricted Access</h2>
        <a href="/" style={{ color: colors.allianceBlue }}>Return Home</a>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif', color: colors.charcoal }}>
      <Head><title>CMD District Admin</title></Head>
      <header style={{ backgroundColor: colors.oceanBlue, color: colors.white, padding: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>DISTRICT KNOWLEDGE & ACTIVITY</h1>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        {/* Knowledge Base Section */}
        <section style={{ backgroundColor: colors.white, padding: '2rem', marginBottom: '2rem', borderRadius: '2px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: colors.deepSea, marginTop: 0 }}>District Handbook Intelligence</h2>
          <p style={{ fontSize: '0.85rem' }}>Paste the text from your Ordination Handbook PDF here. Gemini will use this as its source of truth.</p>
          <textarea 
            value={handbookText} 
            onChange={(e) => setHandbookText(e.target.value)}
            style={{ width: '100%', height: '300px', padding: '1rem', border: `1px solid ${colors.cloudGray}`, marginBottom: '1rem', fontFamily: 'serif' }}
          />
          <button onClick={saveKnowledge} disabled={saving} style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '0.7rem 2rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            {saving ? 'SAVING...' : 'UPDATE HANDBOOK INTELLIGENCE'}
          </button>
        </section>

        {/* Activity Report Section */}
        <section style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '2px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Ordinand Engagement</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.cloudGray}`, textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Ordinand</th>
                <th style={{ padding: '1rem' }}>Interactions</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.cloudGray}` }}>
                  <td style={{ padding: '1rem' }}>{row.full_name || 'In-Progress'}</td>
                  <td style={{ padding: '1rem' }}>{row.total_interactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
