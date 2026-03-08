import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase directly to avoid the "Module not found" error
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Alliance Brand Colors
  const colors = {
    primaryBlue: '#2b388f',
    allianceRed: '#7f1214',
    allianceGray: '#939598',
    white: '#ffffff',
    bgLight: '#f4f4f4'
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      // This calls the 'district_activity_report' View from your Supabase SQL
      const { data, error } = await supabase
        .from('district_activity_report')
        .select('*')
        .order('last_active', { ascending: false });

      if (error) throw error;
      setReportData(data || []);
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.bgLight, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Head>
        <title>Admin | CMD Ordination Reporting</title>
      </Head>

      <header style={{ backgroundColor: colors.primaryBlue, color: colors.white, padding: '1.5rem', borderBottom: `4px solid ${colors.allianceRed}`, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', textTransform: 'uppercase' }}>District Activity Report</h1>
        <p style={{ margin: '5px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Internal Use Only - Canadian Midwest District</p>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ color: colors.primaryBlue, margin: 0, fontSize: '1.2rem' }}>Ordinand Engagement</h2>
            <button 
              onClick={fetchReport}
              style={{ backgroundColor: 'transparent', border: `1px solid ${colors.primaryBlue}`, color: colors.primaryBlue, padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Refresh Data
            </button>
          </div>

          {loading ? (
            <p style={{ color: colors.allianceGray }}>Loading district data...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.allianceGray}` }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Ordinand</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Mentor</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Interactions</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>{row.full_name || 'In-Progress'}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{row.mentor_name || 'N/A'}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{row.total_interactions}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {row.last_active ? new Date(row.last_active).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {reportData.length === 0 && !loading && (
            <p style={{ textAlign: 'center', color: colors.allianceGray, marginTop: '2rem' }}>No ordinand activity found.</p>
          )}
        </div>
      </main>
    </div>
  );
}
