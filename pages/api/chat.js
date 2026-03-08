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

    if (!apiKey) throw new Error("API Key missing in Vercel.");

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash",
      systemInstruction: `
        You are the CMD Ordination Mentor (Canadian Midwest District).
        CONTEXT: ${districtContext}
        
        MANDATORY RULES:
        1. PRAXIS LOOP: After a user answers a theological question, follow up with ONE "Ministry Praxis" question (e.g., "How does this impact your leadership at a board meeting?").
        2. BREVITY: Keep every response under 4 sentences.
        3. SOCRATIC: Ask only ONE question at a time. Do not dump information.
        4. TONE: Pastoral, Christ-centred, and encouraging.
        5. CITATIONS: Briefly cite the CMD Handbook when applicable.
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

    // Log to Supabase (Background)
    supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]).then();

    return res.status(200).json({ reply: text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
