// ==================================================
// FILE 1: scripts/build-embeddings.js
// One-time script to process documents
// Run: node scripts/build-embeddings.js
// ==================================================

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function buildEmbeddings() {
  console.log('🔨 Building document embeddings...\n');
  
  const documentsDir = path.join(process.cwd(), 'public', 'documents');
  const outputPath = path.join(process.cwd(), 'public', 'embeddings.json');
  
  if (!fs.existsSync(documentsDir)) {
    console.error('❌ Documents directory not found:', documentsDir);
    process.exit(1);
  }
  
  const chunks = [];
  const files = fs.readdirSync(documentsDir);
  
  for (const file of files) {
    if (file === 'keep.txt' || file.startsWith('.')) continue;
    
    console.log(`📄 Processing: ${file}`);
    const filePath = path.join(documentsDir, file);
    let text = '';
    
    // Extract text
    try {
      if (file.endsWith('.txt')) {
        text = fs.readFileSync(filePath, 'utf-8');
      } else if (file.endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        text = pdfData.text;
      }
    } catch (err) {
      console.error(`   ⚠️  Failed to read ${file}:`, err.message);
      continue;
    }
    
    // Split into chunks (500 words each, ~2000 chars)
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i += 500) {
      const chunk = words.slice(i, i + 500).join(' ');
      if (chunk.trim().length < 100) continue; // Skip tiny chunks
      
      chunks.push({
        source: file,
        text: chunk.trim(),
        chunkIndex: Math.floor(i / 500),
        wordCount: Math.min(500, words.length - i)
      });
    }
    
    console.log(`   ✅ Created ${Math.ceil(words.length / 500)} chunks`);
  }
  
  console.log(`\n📚 Total chunks created: ${chunks.length}`);
  console.log('🧮 Generating embeddings (this may take a few minutes)...\n');
  
  // Generate embeddings using Gemini
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  for (let i = 0; i < chunks.length; i++) {
    try {
      const result = await model.embedContent(chunks[i].text);
      chunks[i].embedding = result.embedding.values;
      
      if ((i + 1) % 10 === 0) {
        console.log(`⏳ Progress: ${i + 1}/${chunks.length}`);
      }
      
      // Rate limiting - avoid API throttling
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error(`❌ Error on chunk ${i}:`, err.message);
      // Continue anyway - partial embeddings better than none
    }
  }
  
  // Filter out chunks that failed to get embeddings
  const validChunks = chunks.filter(c => c.embedding);
  
  // Save to file
  fs.writeFileSync(outputPath, JSON.stringify(validChunks, null, 2));
  console.log(`\n✅ Saved embeddings to: ${outputPath}`);
  console.log(`📊 Valid chunks: ${validChunks.length}/${chunks.length}`);
  console.log(`💾 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n🎉 Done! You can now run your app.');
}

buildEmbeddings().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});


// ==================================================
// FILE 2: lib/searchDocs.js
// Search function using cosine similarity
// ==================================================

import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let cachedEmbeddings = null;

function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchDocuments(query, topK = 5) {
  // Load embeddings (cached in memory)
  if (!cachedEmbeddings) {
    const embeddingsPath = path.join(process.cwd(), 'public', 'embeddings.json');
    
    if (!fs.existsSync(embeddingsPath)) {
      console.warn('⚠️  Embeddings not found! Run: npm run build-embeddings');
      return [];
    }
    
    try {
      const fileContent = fs.readFileSync(embeddingsPath, 'utf-8');
      cachedEmbeddings = JSON.parse(fileContent);
      console.log(`✅ Loaded ${cachedEmbeddings.length} document chunks`);
    } catch (err) {
      console.error('❌ Failed to load embeddings:', err.message);
      return [];
    }
  }
  
  // Generate query embedding
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(query);
    const queryEmbedding = result.embedding.values;
    
    // Calculate similarities
    const scored = cachedEmbeddings.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by relevance and return top K
    scored.sort((a, b) => b.score - a.score);
    
    const results = scored.slice(0, topK);
    
    // Log search quality
    console.log(`🔍 Search results: Top score ${(results[0]?.score * 100).toFixed(1)}%, Bottom score ${(results[results.length - 1]?.score * 100).toFixed(1)}%`);
    
    return results;
  } catch (err) {
    console.error('❌ Search failed:', err.message);
    return [];
  }
}

// Clear cache (useful for hot reload in development)
export function clearCache() {
  cachedEmbeddings = null;
}


// ==================================================
// FILE 3: app/api/chat/route.js
// Updated to use RAG instead of loading all documents
// ==================================================

import { NextResponse } from "next/server";
import { searchDocuments } from "@/lib/searchDocs";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const { message, image } = await req.json();

    // Search for relevant document chunks
    let contextData = "";
    
    if (message && message.trim()) {
      try {
        // Adjust topK based on query complexity
        const topK = image ? 7 : 5; // More context if analyzing image
        const relevantChunks = await searchDocuments(message, topK);
        
        if (relevantChunks.length > 0) {
          contextData = "\n=== RELEVANT REGULATIONS ===\n";
          
          for (const chunk of relevantChunks) {
            contextData += `\n--- Source: ${chunk.source} ---\n`;
            contextData += `${chunk.text}\n`;
          }
          
          console.log(`📚 Using ${relevantChunks.length} relevant chunks (${contextData.length} chars, ~${Math.round(contextData.length / 4)} tokens)`);
        } else {
          console.warn('⚠️  No relevant chunks found');
        }
      } catch (err) {
        console.error("❌ Search failed:", err.message);
        contextData = "\n(Note: Document search unavailable - providing general guidance)\n";
      }
    }

    // Build system instruction
    const systemInstruction = `You are Protocol, a food safety intelligence assistant.
    
CORE INSTRUCTIONS:
1. If an IMAGE is provided, analyze it for food safety violations based on the Context Documents.
2. Look for: Cross-contamination, improper storage, dirty surfaces, temperature abuse, or unsafe practices.
3. If NO violations found, say "This looks compliant based on visual inspection," but note you cannot measure temperature visually.
4. ALWAYS cite your sources with specific document names (e.g., "According to FDA_FOOD_CODE_2022.pdf Section 3-501.16...").
5. Use **Bold** formatting for key issues and violations.
6. Be specific about what needs to be corrected and how.

${contextData || "No context documents found."}`;

    // Construct message parts
    const parts = [{ 
      text: `${systemInstruction}\n\nUSER QUESTION: ${message || "Analyze this image for food safety violations."}` 
    }];
    
    if (image) {
      const base64Data = image.includes(',') ? image.split(",")[1] : image;
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      });
    }

    // Make API request to Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more factual responses
          maxOutputTokens: 2048,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      throw new Error(data.error?.message || "Google API Error");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("No response generated");
    }

    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ 
      error: error.message || "An error occurred" 
    }, { status: 500 });
  }
}
