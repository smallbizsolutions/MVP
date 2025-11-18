import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    // 1. Validate API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    const { message } = await req.json();

    // 2. LOAD DOCUMENTS (The Knowledge Base)
    const documentsDir = path.join(process.cwd(), "public", "documents");
    let contextData = "";

    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            // Skip system files or placeholders
            if (file === 'keep.txt' || file.startsWith('.')) continue;

            if (file.endsWith('.txt')) {
                contextData += `\n-- SOURCE DOC: ${file} --\n${fs.readFileSync(filePath, 'utf-8')}\n`;
            } else if (file.endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdf(dataBuffer);
                contextData += `\n-- SOURCE DOC: ${file} --\n${pdfData.text}\n`;
            }
         }
       }
    } catch (e) { console.warn("Read error", e); }

    // 3. THE BRAIN (Updated for "Protocol" Branding)
    const systemInstruction = `You are Protocol, a food safety intelligence assistant.
    
    CORE INSTRUCTIONS:
    1. Answer the user's question based ONLY on the provided Context Documents below.
    2. **Cite Your Sources:** You must mention the specific document name (e.g., "According to the Food Code...") when providing facts.
    3. **Handling Missing Info:** If the answer is NOT in the documents, explicitly state: "I couldn't find that specific detail in the official protocols," and then provide a general food safety best practice, clearly labeling it as general guidance.
    4. **Tone:** Professional, authoritative, efficient, and helpful.
    5. **Formatting:** Use **Bold** for key terms and bullet points for lists to make it easy to read on a tablet in a busy kitchen.

    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`;

    // 4. API REQUEST (Direct to Gemini 2.5 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `${systemInstruction}\n\nUSER QUESTION: ${message}` }] 
        }]
      })
    });

    const data = await response.json();

    // 5. Handle Google Errors
    if (!response.ok) {
      console.error("Google API Error:", data);
      throw new Error(data.error?.message || "Google API Error");
    }

    // 6. Return Answer
    const text = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
