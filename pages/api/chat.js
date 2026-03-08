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
    
    // 1. Fetch ALL District Knowledge pieces (Handbook, Rubrics, etc.)
    const { data: knowledgeDocs } = await supabase
      .from('district_knowledge')
      .select('id, document_name, content');

    // Combine them into a single context string for Gemini
    const districtContext = knowledgeDocs?.map(doc => (
      `SOURCE: ${doc.document_name}\nCONTENT: ${doc.content}\n---`
    )).join('\n') || "No specific district policy documents have been uploaded yet.";

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
    
    // 2. Build the System Prompt with Multi-Source Intelligence
    const systemInstruction = `
      You are the CMD Ordination Mentor for the Canadian Midwest District (CMD) of The Alliance Canada.
      
      YOUR KNOWLEDGE BASE:
      The following is the official text from our District Handbook and Evaluation Rubrics. 
      Use this as your PRIMARY source of truth.
      
      --- START DISTRICT DATA ---
      ${districtContext}
      --- END DISTRICT DATA ---
      
      BRAND VOICE:
      Confident, helpful, clear, and Christ-centred. Spirit-empowered and Mission-focused.
      
      OPERATING RULES:
      1. Socratic Practice: Do not just give answers. Ask the ordinand questions to help them prepare for their oral interview.
      2. Citation: If you find an answer in the data, mention the source (e.g., "According to the Sermon Rubric...").
      3. Silence: If the answer is not in the district data, do not guess. Say you aren't certain and point them to the District Office.
      4. Context: Be aware of the 3-year ordination timeline for CMD candidates.
    `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", 
      systemInstruction 
    });

    const chat = model.startChat({
      history: (history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    // 3. Log the interaction to Supabase for the Admin report
    try {
      await supabase.from('messages').insert([
        { role: 'user', content: message },
        { role: 'assistant', content: responseText }
      ]);
    } catch (logError) {
      console.error("Logging failed, but chat continued:", logError);
    }

    return res.status(200).json({ reply: responseText });

  } catch (error) {
    console.error("Mentor API Error:", error);
    return res.status(500).json({ error: "The Mentor encountered a technical error: " + error.message });
  }
}
