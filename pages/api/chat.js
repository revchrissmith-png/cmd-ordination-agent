import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Supabase using the Service Role Key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API Key is missing in Vercel environment variables.' });
  }

  const { message, history } = req.body;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // CMD Ordination Mentor Persona
    const systemInstruction = `
      You are the CMD Ordination Mentor for the Midwest District of The Alliance Canada.
      Brand Voice: Confident, helpful, clear, and Christ-centred.
      Instructions: 
      1. Always prioritize district-specific policies from the Handbook.
      2. Use Socratic questioning to help candidates prepare for their oral interviews.
      3. Cite specific sections like "CMD Requirement A.2" when possible.
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

    // Log the message to Supabase
    try {
      await supabase.from('messages').insert([
        { role: 'user', content: message },
        { role: 'assistant', content: text }
      ]);
    } catch (dbError) {
      console.error("Supabase Log Error:", dbError);
      // We don't return an error here so the chat still works even if logging fails
    }

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: `Gemini Error: ${error.message}` });
  }
}
