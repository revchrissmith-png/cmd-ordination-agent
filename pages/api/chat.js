import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history } = req.body;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("API Key configuration missing.");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the 'latest' alias to avoid 404 versioning issues
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const chat = model.startChat({
      history: (history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Log the message to Supabase
    try {
      await supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]);
    } catch (e) { console.error("Database Log Error:", e); }

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini SDK Error:", error);
    return res.status(500).json({ error: `Mentor Logic Error: ${error.message}` });
  }
}
