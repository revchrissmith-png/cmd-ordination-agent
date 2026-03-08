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

    if (!apiKey) throw new Error("API Key missing in Vercel environment.");

    // Fetch Handbook content
    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "No handbook text found.";

    // INITIALIZING GEMINI 3 FLASH (The 2026 Standard)
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the current production string for Gemini 3 Flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash", 
      systemInstruction: `
        You are the CMD Ordination Mentor (Canadian Midwest District). 
        Brand: Christ-centred, Spirit-empowered, Mission-focused.
        
        CONTEXT:
        ${districtContext}
        
        RULES:
        1. Socratic Method: Ask questions to help them prepare for their interview.
        2. Citations: Mention the CMD Handbook when quoting rules.
        3. Boundary: If not in the context, refer them to the District Office.
      `
    });

    const chat = model.startChat({
      history: (history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    // Log to Supabase
    try {
      await supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]);
    } catch (e) { console.error("Logging Error:", e); }

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("2026 API Error:", error);
    return res.status(500).json({ error: `Mentor Logic Error: ${error.message}. Ensure you are using @google/generative-ai version 0.22.0 or later.` });
  }
}
