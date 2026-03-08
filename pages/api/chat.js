import { createClient } from '@supabase/supabase-js';
const { GoogleGenerativeAI } = require("@google/generative-ai");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;

  try {
    const systemInstruction = `
      You are the CMD Ordination Study Agent for the Canadian Midwest District.
      Authority: CMD Ordination Handbook and Alliance Canada Policy.
      Voice: Confident, helpful, clear, and Christ-centred.
      
      Instructions:
      1. Use Socratic questioning to help ordinands practice for interviews.
      2. Cite specific requirements (e.g., A.2 CMD Requirements).
      3. Maintain a 3-year completion focus.
    `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
    });

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const reply = response.text();

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "The Mentor encountered an error." });
  }
}
