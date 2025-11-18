import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { message } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // SIMPLIFIED: Always look in the public/documents folder included in your code
    const documentsDir = path.join(process.cwd(), "public", "documents");
    
    let contextData = "";

    // Read files
    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            if (file.endsWith('.txt')) {
                contextData += `\n--- SOURCE: ${file} ---\n${fs.readFileSync(filePath, 'utf-8')}\n`;
            } else if (file.endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdf(dataBuffer);
                contextData += `\n--- SOURCE: ${file} ---\n${pdfData.text}\n`;
            }
         }
       }
    } catch (e) { console.warn("No context loaded", e); }

    // Prompt
    const systemInstruction = `You are the Washtenaw County Compliance Assistant.
    Answer using the following context. If the answer isn't there, rely on general food safety knowledge but state that you are doing so.
    
    CONTEXT:
    ${contextData.slice(0, 60000)}`; 

    const result = await model.generateContent(`${systemInstruction}\n\nUSER QUESTION: ${message}`);
    const response = await result.response;
    return NextResponse.json({ response: response.text() });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
