import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function LoginPage() {
  const colors = { deepSea: '#00426A', allianceBlue: '#0077C8', cloudGray: '#EAEAEE' };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin } // Sends them back to index.js after login
    });
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
        <img src="https://i.imgur.com/ZHqDQJC.png" alt="Logo" style={{ height: '50px', marginBottom: '1.5rem' }} />
        <h1 style={{ color: colors.deepSea, fontSize: '1.2rem', marginBottom: '2rem', fontWeight: 'bold' }}>CMD STUDY AGENT</h1>
        <button 
          onClick={handleGoogleLogin}
          style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ height: '18px' }} />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
