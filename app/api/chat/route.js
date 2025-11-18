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
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const { message } = await req.json();

    // *** THE FIX: Switch to the standard model ***
    // "gemini-pro" is available on all accounts and won't 404.
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // --- 1. LOAD THE FILES (THE MEMORY) ---
    const documentsDir = path.join(process.cwd(), "public", "documents");
    let contextData = "";

    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            // Skip placeholder
            if (file === 'keep.txt') continue;

            if (file.endsWith('.txt')) {
                contextData += `\n-- DOCUMENT: ${file} --\n${fs.readFileSync(filePath, 'utf-8')}\n`;
            } else if (file.endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdf(dataBuffer);
                contextData += `\n-- DOCUMENT: ${file} --\n${pdfData.text}\n`;
            }
         }
       }
    } catch (e) { console.warn("Context read error", e); }

    // --- 2. DEFINE THE INSTRUCTIONS (THE BRAIN) ---
    // This is where you control the bot's personality and rules.
    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant. 
    
    YOUR INSTRUCTIONS:
    1. Answer the user's question based ONLY on the provided Context Documents below.
    2. If the answer is in the documents, cite the document name.
    3. If the answer is NOT in the documents, state: "I couldn't find that in your official documents," and then provide a general answer based on standard food safety rules.
    4. Be professional, concise, and helpful to restaurant owners.

    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`; 

    // --- 3. GENERATE RESPONSE ---
    const result = await model.generateContent(`${systemInstruction}\n\nUSER QUESTION: ${message}`);
    const response = await result.response;
    
    return NextResponse.json({ response: response.text() });

  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: "AI Error: " + error.message }, { status: 500 });
  }
}
