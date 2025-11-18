import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Initialize Gemini with your API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Allow the function to run for up to 60 seconds
export const maxDuration = 60;

export async function POST(req) {
  try {
    // 1. Check if API Key exists
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    // 2. Get the user's message
    const { message } = await req.json();

    // 3. Define the specific model
    // We use the '001' version to avoid "model not found" errors
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // 4. Try to read the "Knowledge Base" file if it exists
    let contextData = "";
    const documentsDir = path.join(process.cwd(), "public", "documents");
    
    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         // Find the first .txt file
         const txtFile = files.find(f => f.endsWith('.txt'));
         
         if (txtFile) {
           const filePath = path.join(documentsDir, txtFile);
           contextData = fs.readFileSync(filePath, 'utf-8');
           console.log(`Loaded context from: ${txtFile}`);
         }
       }
    } catch (fileError) {
       // If file reading fails, log it but don't crash the app
       console.warn("Could not read context file:", fileError);
    }

    // 5. Construct the prompt
    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant. 
    Use the following context to answer the user's question if relevant. 
    If the context doesn't contain the answer, use your general knowledge but mention you are doing so.
    
    CONTEXT:
    ${contextData.slice(0, 30000)} 
    `; 

    const finalPrompt = `${systemInstruction}\n\nUSER QUESTION: ${message}`;

    // 6. Generate Response
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process request: " + error.message },
      { status: 500 }
    );
  }
}
