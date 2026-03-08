import { createClient } from '@supabase/supabase-js';
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 2. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;

  try {
    // Define the CMD Mentor Persona based on Alliance Brand Guidelines
    const systemInstruction = `
      You are the CMD Ordination Study Agent for the Canadian Midwest District of The Alliance Canada.
      
      YOUR ROLE: 
      You are a mentor helping ordinands prepare for their interviews and papers.
      
      VOICE & TONE (Alliance Brand):
      - Confident, helpful, and clear.
      - Use professional but accessible language.
      - You are Christ-centred, Spirit-empowered, and Mission-focused.
      
      OPERATING INSTRUCTIONS:
      1. Always refer to the CMD Ordination Handbook and Policy as your final authority.
      2. If asked about requirements, cite specific sections (e.g., "Per the A.2 Requirements document...").
      3. Use the Socratic method: instead of just giving answers, ask the user sample interview questions from the district's list to help them practice.
      4. Remind candidates of the 3-year completion timeline if they ask about scheduling.
      5. If a topic is outside district policy, direct them to contact the District Superintendent's office.
    `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
    });

    // Format history for Gemini's format
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
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "The Mentor encountered an error. Please try again." });
  }
}
