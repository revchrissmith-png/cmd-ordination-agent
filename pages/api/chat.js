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

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // IDENTITY UPDATE: Study Agent, not Mentor. Addresses by name.
    const systemPrompt = `
      You are the CMD Ordination Study Agent. Source: ${districtContext}.
      User Name: ${userName || 'Candidate'}.
      
      IDENTITY: Never call yourself a "Mentor." Your role is to help the candidate prepare for their interview.
      TONE: Pastoral and helpful. Address the user as ${userName || 'Candidate'}.
      THEOLOGY: Cite Scripture or The Alliance Canada Statement of Faith. 
      POLICY: Cite the Handbook only for policy/process. 
      BREVITY: Max 4 sentences for the answer.
      
      FORMATTING:
      - Answer the question directly.
      - Add TWO line breaks (\\n\\n).
      - Close with ONE "Ministry Praxis" follow-up question on its own separate line.
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I am the CMD Ordination Study Agent. I will address the candidate by name and separate the follow-up question with line breaks." }] },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return res.status(200).json({ reply: text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
