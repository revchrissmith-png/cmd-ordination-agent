import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Supabase with safety checks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Safety check for the API Key
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API Key is missing in environment variables.' });
  }

  const { message, history } = req.body;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const systemInstruction = `
      You are the CMD Ordination Mentor for the Midwest District of The Alliance Canada.
      Brand Voice: Christ-centred, Spirit-empowered, Mission-focused.
      Authority: Use the CMD Ordination Handbook and Alliance Canada Policy.
      Method: Be helpful, clear, and use Socratic questioning to help candidates prepare.
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

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: "The Mentor encountered a technical issue. Please try again." });
  }
}
