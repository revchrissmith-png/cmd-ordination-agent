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
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // REVISED INSTRUCTIONS: Direct, concise, and minimal citations.
    const systemPrompt = `
      You are the CMD Ordination Mentor.
      SOURCE: ${districtContext}
      
      MANDATORY VOICE RULES:
      1. DIRECTNESS: Do not use "flowery" or "stifled" greetings. Avoid "I am happy to support you" or "It is a joy to discuss." Get straight to the feedback.
      2. BREVITY: Max 3 sentences.
      3. CITATIONS: Only cite the handbook if you are quoting a specific policy. Do not cite your own presence or willingness to help.
      4. SOCRATIC: Ask exactly ONE ministry application question per response. 
      5. TONE: Professional, pastoral, and efficient.
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will be direct, concise, and only use citations for specific handbook policies." }] },
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
