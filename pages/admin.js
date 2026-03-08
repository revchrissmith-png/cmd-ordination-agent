import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Correct Alliance Formulas [cite: 11, 21, 26]
  const colors = {
    deepSea: '#00426A',
    oceanBlue: '#006298',
    cloudGray: '#EAEAEE',
    white: '#ffffff',
    charcoal: '#040404'
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('district_activity_report')
        .select('*')
        .order('last_active', { ascending: false });

      if (error) throw error;
      setReportData(data || []);
    } catch (error) {
      console.error("Report Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Head>
        <title>Admin Reporting | CMD</title>
      </Head>

      <header style={{ backgroundColor: colors.oceanBlue, color: colors.white, padding: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>DISTRICT ACTIVITY REPORT</h1>
        <p style={{ margin: '5px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>INTERNAL USE ONLY - CMD</p>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '2px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h2 style={{ color: colors.deepSea, margin: 0 }}>Ordinand Engagement</h2>
            <button onClick={fetchReport} style={{ cursor: 'pointer', padding: '0.5rem 1rem', border: `1px solid ${colors.oceanBlue}`, background: 'transparent', color: colors.oceanBlue }}>Refresh</button>
          </div>

          {loading ? <p>Loading...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.cloudGray}`, textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Ordinand</th>
                  <th style={{ padding: '1rem' }}>Total Interactions</th>
                  <th style={{ padding: '1rem' }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.cloudGray}` }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{row.full_name || 'In-Progress'}</td>
                    <td style={{ padding: '1rem' }}>{row.total_interactions}</td>
                    <td style={{ padding: '1rem' }}>{row.last_active ? new Date(row.last_active).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
