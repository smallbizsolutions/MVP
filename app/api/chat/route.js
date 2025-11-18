import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // 4. Load Context (Reads both TXT and PDF files)
    let contextData = "";
    const documentsDir = path.join(process.cwd(), "public", "documents");
    
    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         
         // Loop through all files in the uploads folder
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            const fileName = file.toLowerCase();

            try {
                // Handle .txt files
                if (fileName.endsWith('.txt')) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    contextData += `\n--- START OF SOURCE: ${file} ---\n${content}\n`;
                    console.log(`Loaded text file: ${file}`);
                }
                // Handle .pdf files
                else if (fileName.endsWith('.pdf')) {
                    const dataBuffer = fs.readFileSync(filePath);
                    // Parse the PDF buffer to text
                    const pdfData = await pdf(dataBuffer);
                    contextData += `\n--- START OF SOURCE: ${file} ---\n${pdfData.text}\n`;
                    console.log(`Loaded PDF file: ${file}`);
                }
            } catch (err) {
                console.error(`Error parsing file ${file}:`, err);
            }
         }
       }
    } catch (dirError) {
       console.warn("Could not access documents directory:", dirError);
    }

    // 5. Construct the prompt
    // We truncate the context to 60,000 characters to be safe, though Gemini Flash can handle more.
    const cleanContext = contextData ? contextData.slice(0, 60000) : "No documents found.";

    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant. 
    
    Use the provided context (Official Food Code, Guidelines, etc.) to answer the user's question accurately. 
    - If the answer is found in the context, cite the specific source (e.g., "According to the Michigan Modified Food Code...").
    - If the context does not contain the answer, use your general knowledge but strictly warn the user: "I couldn't find this in your uploaded documents, but generally..."
    
    CONTEXT FROM UPLOADED FILES:
    ${cleanContext}
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
