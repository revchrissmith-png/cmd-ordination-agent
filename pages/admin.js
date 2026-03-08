import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function AdminDashboard() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const ADMIN_EMAIL = 'chris@canadianmidwest.ca';
  const colors = { deepSea: '#00426A', allianceBlue: '#0077C8', cloudGray: '#EAEAEE', white: '#ffffff' };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email?.toLowerCase();
      setUserEmail(email || 'Not logged in');

      if (email === ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(true);
        const { data } = await supabase.from('district_activity_report').select('*');
        setReportData(data || []);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'Arial' }}>Verifying District Superintendent Access...</div>;

  if (!authorized) return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
      <div style={{ background: colors.white, padding: '3rem', textAlign: 'center', borderTop: `5px solid ${colors.deepSea}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: colors.deepSea }}>Access Restricted</h2>
        <p>This page is for Chris@canadianmidwest.ca only.</p>
        <p style={{ fontSize: '0.8rem', color: colors.allianceBlue }}>Current User: {userEmail}</p>
        <a href="/" style={{ fontWeight: 'bold', color: colors.allianceBlue }}>Return to Home</a>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial' }}>
      <Head><title>CMD Admin Portal</title></Head>
      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1.5rem', textAlign: 'center', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>DISTRICT ACTIVITY REPORT</h1>
      </header>
      <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
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
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{row.full_name}</td>
                  <td style={{ padding: '1rem' }}>{row.total_interactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
