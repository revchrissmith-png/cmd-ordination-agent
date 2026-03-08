import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Configuration Error' });

  try {
    const { message, history } = req.body;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const systemInstruction = `
      You are the CMD Ordination Mentor for the Canadian Midwest District of The Alliance Canada.
      Voice: Professional, helpful, and Christ-centred.
      Guidelines: 
      - Use Socratic questioning to prepare candidates for oral interviews.
      - Always cite the CMD Ordination Handbook or Alliance Policy.
      - Maintain strict adherence to the district's 3-year timeline.
    `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction 
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

    await supabase.from('messages').insert([
      { role: 'user', content: message },
      { role: 'assistant', content: text }
    ]);

    return res.status(200).json({ reply: text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
