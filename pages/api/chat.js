import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history, userId } = req.body;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) throw new Error("API Key missing.");

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash",
      systemInstruction: `You are the CMD Ordination Mentor. Source: ${districtContext}. 
      Rules: 1. Always follow up with a ministry praxis question. 2. Max 4 sentences. 3. Socratic tone.`
    });

    // Manually map history to ensure "model" role is used (fixes empty bubbles)
    const chat = model.startChat({
      history: (history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content || "" }],
      })),
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    // Log to Supabase for tracking
    if (userId) {
      await supabase.from('messages').insert([
        { role: 'user', content: message, user_id: userId }, 
        { role: 'assistant', content: text, user_id: userId }
      ]);
    }

    return res.status(200).json({ reply: text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
