import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  const colors = {
    deepSea: '#00426A',      // Pantone 2188 C
    oceanBlue: '#006298',    // Pantone 7691 C
    cloudGray: '#EAEAEE',    // Cool Grey 1 C
    white: '#ffffff',
    charcoal: '#040404'      // Black 6 C
  };

  const ADMIN_EMAIL = 'Chris@canadianmidwest.ca';

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === ADMIN_EMAIL) {
      setAuthorized(true);
      setUserEmail(session.user.email);
      fetchReport();
    } else {
      setLoading(false);
    }
  };

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

  if (!authorized && !loading) {
    return (
      <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Helvetica, Arial, sans-serif' }}>
        <div style={{ backgroundColor: colors.white, padding: '3rem', borderRadius: '2px', textAlign: 'center', borderTop: `5px solid ${colors.deepSea}` }}>
          <h2 style={{ color: colors.deepSea }}>Access Restricted</h2>
          <p style={{ color: colors.charcoal }}>This reporting dashboard is for District Superintendent access only.</p>
          <a href="/" style={{ color: colors.oceanBlue, fontWeight: 'bold' }}>Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Head>
        <title>District Admin | CMD</title>
      </Head>

      <header style={{ backgroundColor: colors.oceanBlue, color: colors.white, padding: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>DISTRICT ACTIVITY REPORT</h1>
        <p style={{ margin: '5px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Logged in as: {userEmail}</p>
      </header>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '2px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h2 style={{ color: colors.deepSea, margin: 0 }}>Ordinand Engagement</h2>
            <button onClick={fetchReport} style={{ cursor: 'pointer', padding: '0.5rem 1rem', border: `1px solid ${colors.oceanBlue}`, background: 'transparent', color: colors.oceanBlue }}>Refresh</button>
          </div>

          {loading ? <p>Verifying credentials...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.cloudGray}`, textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Ordinand</th>
                  <th style={{ padding: '1rem' }}>Interactions</th>
                  <th style={{ padding: '1rem' }}>
