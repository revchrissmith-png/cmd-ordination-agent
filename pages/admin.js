import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('knowledge'); // 'knowledge', 'engagement', 'reports'
  const [ordinandActivity, setOrdinandActivity] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [knowledgeText, setKnowledgeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const colors = {
    deepSea: '#00426A',
    oceanBlue: '#006298',
    allianceBlue: '#0077C8',
    cloudGray: '#EAEAEE',
    white: '#ffffff',
    allianceRed: '#7f1214' // Used sparingly for alerts
  };

  const ADMIN_EMAIL = 'chris@canadianmidwest.ca';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(true);
        fetchData();
      } else {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: activity } = await supabase.from('district_activity_report').select('*');
    const { data: overdue } = await supabase.from('overdue_contacts').select('*');
    const { data: knowledge } = await supabase.from('district_knowledge').select('content').eq('id', 'cmd_handbook').single();
    
    setOrdinandActivity(activity || []);
    setOverdueList(overdue || []);
    setKnowledgeText(knowledge?.content || '');
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem', color: colors.deepSea }}>Loading District Dashboard...</div>;

  if (!authorized) return <div style={{ textAlign: 'center', padding: '5rem' }}>Access Denied.</div>;

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head><title>CMD District Admin</title></Head>
      
      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1.5rem 2rem', borderBottom: `4px solid ${colors.allianceBlue}` }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>CMD DISTRICT ADMINISTRATION</h1>
        <nav style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem' }}>
          {['knowledge', 'engagement', 'reports'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                background: 'none', border: 'none', color: colors.white, cursor: 'pointer', 
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                borderBottom: activeTab === tab ? `2px solid ${colors.white}` : 'none',
                paddingBottom: '4px', textTransform: 'uppercase', fontSize: '0.8rem'
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
        
        {/* TAB 1: KNOWLEDGE BASE */}
        {activeTab === 'knowledge' && (
          <div style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h2 style={{ color: colors.deepSea, marginTop: 0 }}>District Intelligence</h2>
            <p style={{ fontSize: '0.9rem', color: colors.oceanBlue }}>Update the Handbook or Rubric text here.</p>
            <textarea 
              value={knowledgeText} 
              onChange={(e) => setKnowledgeText(e.target.value)}
              style={{ width: '100%', height: '400px', padding: '1rem', marginTop: '1rem', borderRadius: '4px', border: `1px solid ${colors.cloudGray}` }}
            />
          </div>
        )}

        {/* TAB 2: CHURCH ENGAGEMENT (NEW) */}
        {activeTab === 'engagement' && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            <div style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '4px', borderLeft: `6px solid ${colors.allianceRed}` }}>
              <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Attention Required: Overdue Contacts</h2>
              <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>The following ordinands have not had a recorded mentor check-in for over 30 days.</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: `2px solid ${colors.cloudGray}` }}>
                    <th style={{ padding: '0.8rem' }}>Ordinand</th>
                    <th style={{ padding: '0.8rem' }}>Mentor</th>
                    <th style={{ padding: '0.8rem' }}>Days Since Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueList.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${colors.cloudGray}` }}>
                      <td style={{ padding: '0.8rem' }}>{row.ordinand_name}</td>
                      <td style={{ padding: '0.8rem' }}>{row.mentor_name}</td>
                      <td style={{ padding: '0.8rem', color: colors.allianceRed, fontWeight: 'bold' }}>{row.days_since_contact} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CHAT REPORTS */}
        {activeTab === 'reports' && (
          <div style={{ backgroundColor: colors.white, padding: '2rem', borderRadius: '4px' }}>
            <h2 style={{ color: colors.deepSea, marginTop: 0 }}>Mentor Bot Engagement</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `2px solid ${colors.cloudGray}` }}>
                  <th style={{ padding: '0.8rem' }}>Ordinand</th>
                  <th style={{ padding: '0.8rem' }}>Total Interactions</th>
                </tr>
              </thead>
              <tbody>
                {ordinandActivity.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.cloudGray}` }}>
                    <td style={{ padding: '0.8rem' }}>{row.full_name || 'Anonymous'}</td>
                    <td style={{ padding: '0.8rem' }}>{row.total_interactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}
