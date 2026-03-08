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

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    const systemPrompt = `
      You are the CMD Ordination Mentor.
      SOURCE: ${districtContext}
      
      CONVERSATION FLOW:
      1. When a user provides a theological answer, do NOT move to a new topic yet.
      2. FOLLOW-UP: Ask one "Ministry Praxis" question. How does this specific head knowledge change how they lead a board meeting, counsel a parishioner, or preach in the CMD?
      3. BREVITY: Keep responses under 4 sentences. 
      4. SOCRATIC: Only ask ONE question at a time.
      
      TONE: Pastoral and grounding. Connect the "what" to the "so what" of local church ministry.
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will always follow up with a ministry praxis question to ground their answers in practical leadership." }] },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]).then();

    return res.status(200).json({ reply: text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
