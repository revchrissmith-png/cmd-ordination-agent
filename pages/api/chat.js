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

    if (!apiKey) throw new Error("API Key missing in Vercel environment variables.");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We are switching to the absolute most standard production string.
    // If this fails, the issue is almost certainly the API Key's permissions.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const systemPrompt = `You are the CMD Ordination Mentor. 
    Source: ${knowledge?.content || 'Handbook not found.'}. 
    Only answer based on the handbook. Be Socratic.`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Acknowledged. I am ready." }] },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    await supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]);

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("FULL API ERROR:", error);
    return res.status(500).json({ error: `Connection Failure: ${error.message}. Check your API key permissions in Google AI Studio.` });
  }
}
