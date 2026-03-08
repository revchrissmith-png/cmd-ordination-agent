import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function AdminDashboard() {
  const [reportData, setReportData] = useState([]);
  const [handbookText, setHandbookText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const colors = {
    deepSea: '#00426A',
    allianceBlue: '#0077C8',
    cloudGray: '#EAEAEE',
    white: '#ffffff'
  };

  useEffect(() => {
    fetchData();
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
    await supabase.from('district_knowledge').upsert({ 
      id: 'cmd_handbook', 
      content: handbookText, 
      document_name: 'CMD Ordination Handbook' 
    });
    setSaving(false);
    alert("Handbook Intelligence Updated!");
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head><title>Admin | CMD</title></Head>
      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1.5rem', textAlign: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>DISTRICT ADMINISTRATION (DEV MODE)</h1>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        <section style={{ backgroundColor: colors.white, padding: '2rem', marginBottom: '2rem', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Handbook Intelligence</h2>
          <p style={{ fontSize: '0.8rem', color: colors.allianceBlue, marginBottom: '1rem' }}>
            Paste the handbook text here. This updates the database that the Chat API reads from.
          </p>
          <textarea 
            value={handbookText} 
            onChange={(e) => setHandbookText(e.target.value)}
            style={{ width: '100%', height: '350px', padding: '1rem', border: `1px solid ${colors.cloudGray}`, marginBottom: '1rem', fontFamily: 'serif' }}
            placeholder="Paste Handbook text here..."
          />
          <button onClick={saveKnowledge} disabled={saving} style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '0.8rem 2rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            {saving ? 'UPDATING...' : 'UPDATE HANDBOOK INTELLIGENCE'}
          </button>
        </section>

        <section style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '4px' }}>
          <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Activity Report</h2>
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
