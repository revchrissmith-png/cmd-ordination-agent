import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history, userName } = req.body;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    const systemPrompt = `You are the CMD Ordination Study Agent. Source: ${districtContext}. 
    User: ${userName || 'Candidate'}. 
    Rules: 1. Warm/Pastoral. 2. Theology = Scripture/Statement of Faith. 3. Policy = Handbook. 4. Max 4 sentences. 5. End with ONE unlabeled praxis question after two line breaks.`;

    // DEFENSIVE MAPPING: Ensures no empty strings or wrong roles reach the API
    const safeHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content || "" }]
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will help the candidate prepare." }] },
        ...safeHistory
      ],
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return res.status(200).json({ reply: responseText });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Agent connection failed." });
  }
}
