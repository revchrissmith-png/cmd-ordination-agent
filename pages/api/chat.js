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

    if (!apiKey) throw new Error("Missing API Key");

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // REVERTING TO THE WORKING PREVIEW STRING
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const formattedHistory = (history || [])
      .map(msg => `${msg.role === 'user' ? 'Candidate' : 'Agent'}: ${msg.content}`)
      .join('\n');

    const finalPrompt = `
      You are the CMD Ordination Study Agent.
      Context: ${districtContext}
      Candidate Name: ${userName || 'Candidate'}

      Instructions:
      - Answer theological questions using Scripture.
      - Answer policy questions using the Handbook.
      - 2-4 sentences max.
      - Add TWO line breaks (\\n\\n) then ONE natural ministry praxis question.

      Conversation:
      ${formattedHistory}
      Candidate: ${message}
      Agent:
    `;

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("AI returned empty text.");

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(200).json({ reply: `Debug Error: ${error.message}` });
  }
}
