import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase with Service Role Key for backend admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;

  try {
    // 1. Define the CMD Mentor Persona (System Instructions)
    const systemPrompt = `
      You are the CMD Ordination Study Agent for the Canadian Midwest District of The Alliance Canada.
      
      YOUR AUTHORITY:
      You have access to the CMD Ordination Handbook, Requirements, and Interview Questions. 
      Always prioritize these district-specific policies.
      
      YOUR VOICE (Alliance Brand Voice):
      - Confident: You know the requirements and theology.
      - Helpful: You are a mentor, not just an examiner.
      - Clear: Avoid jargon; speak plainly about the path to ordination.
      
      BEHAVIORAL RULES:
      1. SOCRATIC METHOD: If an ordinand asks a theological question (e.g., "What is the Fourfold Gospel?"), 
         respond with a sample interview question from the Handbook to help them practice.
      2. PERSISTENCE: Refer back to previous parts of the conversation if relevant.
      3. CITATION: When mentioning a requirement, cite the specific Appendix or Document name 
         (e.g., "According to A.2 - CMD Ordination Requirements...").
      4. LIMITS: If a question is outside district policy, direct them to the District Superintendent.
    `;

    // 2. Call OpenAI (Using the Chat Completions API for simplicity)
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Or your preferred model
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content;

    // 3. Optional: Logic to track specific milestones
    // If the AI detects they are asking about a specific paper, we could log it.
    if (message.toLowerCase().includes("divine healing paper")) {
      // This is where we would update the study_progress table in Supabase
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("AI API Error:", error);
    return res.status(500).json({ error: "The Mentor encountered an error. Please try again." });
  }
}
