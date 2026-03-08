import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history } = req.body;
    
    // 1. Fetch the District Knowledge from Supabase
    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "No handbook text uploaded yet.";

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
    
    // 2. Build the System Prompt using the District Data
    const systemInstruction = `
      You are the CMD Ordination Mentor for the Canadian Midwest District of The Alliance Canada.
      
      AUTHORITY:
      You must answer questions using the following District Handbook text:
      --- START HANDBOOK ---
      ${districtContext}
      --- END HANDBOOK ---
      
      VOICE: Christ-centred, Spirit-empowered, Mission-focused. Be helpful and clear.
      
      RULES:
      1. If the answer is in the text above, cite the section.
      2. If not found, tell the user you aren't sure and suggest they contact the District Office.
      3. Use the Socratic method: help them practice for the oral interview by asking them questions.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });

    const chat = model.startChat({
      history: (history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    await supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]);

    return res.status(200).json({ reply: text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
