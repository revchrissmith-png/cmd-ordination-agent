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

    // Fetch Handbook content from Supabase
    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "No handbook text uploaded yet.";

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the most standard, globally available model name
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", 
      systemInstruction: `
        You are the CMD Ordination Mentor for the Canadian Midwest District. 
        Brand Voice: Christ-centred, Spirit-empowered, Mission-focused.
        
        AUTHORITY:
        Use the following handbook text as your source of truth:
        ---
        ${districtContext}
        ---
        
        RULES:
        1. If the answer is in the text, cite the specific section.
        2. Use the Socratic method: Ask practice questions for the oral interview.
        3. If a question is outside district policy, politely state you are unsure and suggest contacting the District Office.
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

    try {
      await supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]);
    } catch (e) { console.error("Logging Error:", e); }

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Returning the full error to help us debug exactly what the API is rejecting
    return res.status(500).json({ error: `Mentor Logic Error: ${error.message}` });
  }
}
