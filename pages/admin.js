import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function AdminDashboard() {
  const [reportData, setReportData] = useState([]);
  const [handbookText, setHandbookText] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = {
    deepSea: '#00426A',
    oceanBlue: '#006298',
    allianceBlue: '#0077C8',
    cloudGray: '#EAEAEE',
    white: '#ffffff',
    charcoal: '#040404'
  };

  const ADMIN_EMAIL = 'chris@canadianmidwest.ca';

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email?.toLowerCase();

      if (email === ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(true);
        fetchData();
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

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
    alert("Handbook Intelligence Updated!");
  };

  if (loading) return <div style={{ padding: '5rem', textAlign: 'center' }}>Verifying District Superintendent...</div>;

  if (!authorized) return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: colors.white, padding: '3rem', borderTop: `5px solid ${colors.deepSea}`, textAlign: 'center' }}>
        <h2>Access Restricted</h2>
        <a href="/" style={{ color: colors.allianceBlue }}>Return Home</a>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head><title>Admin | CMD</title></Head>
      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1.5rem', textAlign: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>DISTRICT ADMINISTRATION</h1>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        <section style={{ backgroundColor: colors.white, padding: '2rem', marginBottom: '2rem', borderRadius: '4px' }}>
          <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Handbook Intelligence</h2>
          <textarea 
            value={handbookText} 
            onChange={(e) => setHandbookText(e.target.value)}
            style={{ width: '100%', height: '300px', padding: '1rem', border: `1px solid ${colors.cloudGray}`, marginBottom: '1rem', fontFamily: 'serif' }}
            placeholder="Paste Handbook text here..."
          />
          <button onClick={saveKnowledge} disabled={saving} style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '0.8rem 2rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            {saving ? 'UPDATING...' : 'UPDATE HANDBOOK INTELLIGENCE'}
          </button>
        </section>

        <section style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '4px' }}>
          <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Ordinand Engagement</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.cloudGray}` }}>
                <th style={{ padding: '1rem' }}>Ordinand</th>
                <th style={{ padding: '1rem' }}>Interactions</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.cloudGray}` }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{row.full_name}</td>
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
