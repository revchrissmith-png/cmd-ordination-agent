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
  const [userEmail, setUserEmail] = useState(null);

  // Official Alliance Canada Palette
  const colors = {
    deepSea: '#00426A',      // Pantone 2188 C
    oceanBlue: '#006298',    // Pantone 7691 C
    allianceBlue: '#0077C8', // Pantone 3005 C
    cloudGray: '#EAEAEE',    // Cool Grey 1 C
    white: '#ffffff',
    charcoal: '#040404'      // Black 6 C
  };

  const ADMIN_EMAIL = 'chris@canadianmidwest.ca';

  useEffect(() => {
    // onAuthStateChange is more reliable for Magic Link redirects 
    // than a one-time getSession call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email?.toLowerCase();
      
      if (email === ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(true);
        setUserEmail(session.user.email);
        fetchData();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: report } = await supabase.from('district_activity_report').select('*');
      const { data: knowledge } = await supabase.from('district_knowledge').select('content').eq('id', 'cmd_handbook').single();
      setReportData(report || []);
      setHandbookText(knowledge?.content || '');
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveKnowledge = async () => {
    setSaving(true);
    try {
      await supabase.from('district_knowledge').upsert({ 
        id: 'cmd_handbook', 
        content: handbookText, 
        document_name: 'CMD Ordination Handbook' 
      });
      alert("District Knowledge Base Updated!");
    } catch (error) {
      alert("Error saving: " + error.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
        <p style={{ color: colors.deepSea, fontWeight: 'bold' }}>Verifying District Credentials...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
        <div style={{ background: colors.white, padding: '3rem', borderRadius: '2px', textAlign: 'center', borderTop: `5px solid ${colors.deepSea}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: colors.deepSea }}>Access Restricted</h2>
          <p style={{ color: colors.charcoal }}>This dashboard is for District Superintendent access only.</p>
          <p style={{ fontSize: '0.8rem', color: colors.oceanBlue }}>Authenticated as: {userEmail || 'Guest'}</p>
          <a href="/" style={{ color: colors.allianceBlue, fontWeight: 'bold', textDecoration: 'none' }}>Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif', color: colors.charcoal }}>
      <Head><title>CMD District Admin</title></Head>
      
      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1.5rem', textAlign: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>DISTRICT KNOWLEDGE & ACTIVITY</h1>
        <p style={{ margin: '5px 0 0', fontSize: '0.75rem', opacity: 0.8 }}>Logged in as: {userEmail}</p>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        <section style={{ backgroundColor: colors.white, padding: '2.5rem', marginBottom: '2rem', borderRadius: '2px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Handbook Intelligence</h2>
          <p style={{ fontSize: '0.85rem', color: colors.oceanBlue }}>Paste the full text of the CMD Ordination Handbook here to update the Mentor's memory.</p>
          <textarea 
            value={handbookText} 
            onChange={(e) => setHandbookText(e.target.value)}
            style={{ width: '100%', height: '300px', padding: '1rem', border: `1px solid ${colors.cloudGray}`, marginBottom: '1rem', fontFamily: 'serif', lineHeight: '1.5' }}
          />
          <button 
            onClick={saveKnowledge} 
            disabled={saving} 
            style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '0.8rem 2rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {saving ? 'SAVING...' : 'UPDATE HANDBOOK INTELLIGENCE'}
          </button>
        </section>

        <section style={{ backgroundColor: colors.white, padding: '2.5rem', borderRadius: '2px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Ordinand Engagement</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.cloudGray}` }}>
                <th style={{ padding: '1rem' }}>Ordinand</th>
                <th style={{ padding: '1rem' }}>Total Interactions</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.cloudGray}` }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{row.full_name || 'Anonymous User'}</td>
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
