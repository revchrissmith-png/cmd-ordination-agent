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

    // Fetch Handbook content from Supabase
    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "No handbook text found.";

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 2026 ACTIVE MODEL: Gemini 3 Flash Preview
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview"
    });

    const systemPrompt = `You are the CMD Ordination Mentor for the Canadian Midwest District. 
    Use this handbook text as your source of truth: ${districtContext}. 
    Rules: Be Socratic, Christ-centered, and cite the CMD Handbook.`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will provide guidance based on the CMD Handbook." }] },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    // Background log to Supabase
    supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]).then();

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: `Mentor Logic Error: ${error.message}` });
  }
}
