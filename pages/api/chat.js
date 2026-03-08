import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history } = req.body;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) throw new Error("API Key configuration missing in Vercel.");

    // 1. Fetch the Handbook content from Supabase
    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "No handbook text found in database.";

    // 2. Initialize Gemini 3 Flash
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the current 2026 production-ready model string
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", 
      systemInstruction: `
        You are the CMD Ordination Mentor for the Canadian Midwest District. 
        Brand Voice: Christ-centred, Spirit-empowered, Mission-focused.
        
        AUTHORITY SOURCE:
        ${districtContext}
        
        RULES:
        1. Accuracy: Only answer based on the provided handbook text.
        2. Socratic Practice: Do not give direct answers for interview prep. Ask questions to help the candidate prepare.
        3. Boundary: If not in the text, say "I'm not certain" and refer them to the District Office.
      `
    });

    const chat = model.startChat({
      history: (history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // 3. Log to Supabase Activity Report
    try {
      await supabase.from('messages').insert([
        { role: 'user', content: message }, 
        { role: 'assistant', content: text }
      ]);
    } catch (e) { console.error("Activity Log Failed:", e.message); }

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Mentor Logic Error:", error);
    return res.status(500).json({ error: `Connection Failure: ${error.message}` });
  }
}
