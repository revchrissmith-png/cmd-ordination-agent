import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function AdminDashboard() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  const colors = {
    primaryBlue: '#2b388f',
    allianceRed: '#7f1214',
    allianceGray: '#939598',
    white: '#ffffff',
    bgLight: '#f8f9fa'
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    // This calls the 'district_activity_report' View we created in the SQL Editor
    const { data, error } = await supabase
      .from('district_activity_report')
      .select('*')
      .order('last_active', { ascending: false });

    if (error) {
      console.error("Error fetching report:", error);
    } else {
      setReportData(data);
    }
    setLoading(false);
  };

  return (
    <div style={{ backgroundColor: colors.bgLight, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Head>
        <title>Admin | CMD Ordination Reporting</title>
      </Head>

      <header style={{ backgroundColor: colors.primaryBlue, color: colors.white, padding: '1.5rem', borderBottom: `4px solid ${colors.allianceRed}` }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>DISTRICT ACTIVITY REPORT</h1>
        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>INTERNAL USE ONLY - CANADIAN MIDWEST DISTRICT</p>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ color: colors.primaryBlue, margin: 0 }}>Ordinand Engagement</h2>
            <button 
              onClick={fetchReport}
              style={{ backgroundColor: 'transparent', border: `1px solid ${colors.primaryBlue}`, color: colors.primaryBlue, padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Refresh Data
            </button>
          </div>

          {loading ? (
            <p>Loading district data...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.allianceGray}` }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Ordinand Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Mentor</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Total Interactions</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>{row.full_name || 'Anonymous User'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{row.mentor_name || 'Unassigned'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{row.total_interactions}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {row.last_active ? new Date(row.last_active).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {reportData.length === 0 && !loading && (
            <p style={{ textAlign: 'center', color: colors.allianceGray, marginTop: '2rem' }}>No activity recorded yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
