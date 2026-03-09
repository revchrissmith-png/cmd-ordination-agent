import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history, userName } = req.body;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // 1. Fetch Handbook Knowledge
    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    // 2. Initialize Gemini 3 Flash
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    // 3. Build a "Single Block" Prompt (Much more stable than Chat History)
    const formattedHistory = (history || [])
      .map(msg => `${msg.role === 'user' ? 'Candidate' : 'Agent'}: ${msg.content}`)
      .join('\n');

    const finalPrompt = `
      You are the CMD Ordination Study Agent.
      Context: ${districtContext}
      Candidate Name: ${userName || 'Candidate'}

      Instructions:
      - Be warm and pastoral.
      - Answer theological questions using Scripture or the Statement of Faith.
      - Answer policy questions using the Handbook.
      - Keep answers to 2-4 sentences.
      - Add TWO line breaks (\\n\\n) at the end.
      - Close with ONE natural ministry praxis question. Do not label it.

      Conversation so far:
      ${formattedHistory}
      Candidate: ${message}
      Agent:
    `;

    // 4. Generate Content directly
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    // 5. Emergency Fallback (If Gemini still sends nothing)
    if (!text || text.trim().length === 0) {
      return res.status(200).json({ reply: "I'm reflecting deeply on that. Could you tell me more about your perspective on this topic?" });
    }

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ reply: "I'm having a hard time connecting right now. Please try again in a moment." });
  }
}
