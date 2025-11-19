// scripts/build-embeddings.js
// One-time script to process documents and create embeddings
// Run: npm run build-embeddings

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
