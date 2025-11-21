// scripts/upload-to-supabase.js
// Robust PDF Uploader - Fixed for "0 chunks" error
// Run: node scripts/upload-to-supabase.js

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate Env Vars
if (!process.env.GEMINI_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables. Please check .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COUNTIES = ['washtenaw', 'wayne', 'oakland'];

// Helper to split text into chunks (approx 500 words)
function chunkText(text, wordsPerChunk = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += (wordsPerChunk - overlap)) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.length > 50) { // Only keep chunks with actual content
      chunks.push(chunk);
    }
  }
  return chunks;
}

async function uploadToSupabase() {
  console.log('🚀 Starting robust multi-county upload...\n');
  
  const documentsDir = path.join(process.cwd(), 'public', 'documents');
  
  // verify directory exists
  if (!fs.existsSync(documentsDir)) {
    console.error('❌ Documents directory not found at:', documentsDir);
    process.exit(1);
  }

  // Clear existing documents
  console.log('🗑️  Clearing existing documents...');
  const { error: deleteError } = await supabase.from('documents').delete().neq('id', 0);
  if (deleteError) console.log('⚠️  Warning clearing DB:', deleteError.message);
  else console.log('✅ Database cleared\n');

  let totalChunks = 0;

  // Loop Counties
  for (const county of COUNTIES) {
    const countyDir = path.join(documentsDir, county);
    if (!fs.existsSync(countyDir)) {
      console.log(`⏩ Skipping ${county} (folder not found)`);
      continue;
    }

    console.log(`\n📍 Processing ${county.toUpperCase()} COUNTY`);
    const files = fs.readdirSync(countyDir);

    for (const file of files) {
      if (file.startsWith('.') || file === 'keep.txt') continue;

      const filePath = path.join(countyDir, file);
      let rawText = '';

      console.log(`   📄 Reading: ${file}`);

      try {
        if (file.endsWith('.pdf')) {
          const dataBuffer = fs.readFileSync(filePath);
          // Standard parsed text
          const data = await pdf(dataBuffer);
          rawText = data.text;
          
          // Log text length to debug "0 chunks" issue
          console.log(`      Existing Text Length: ${rawText.length} chars`);
          if (rawText.length < 100) {
            console.log(`      ⚠️  WARNING: File appears empty or unreadable.`);
          }
        } else if (file.endsWith('.txt')) {
          rawText = fs.readFileSync(filePath, 'utf-8');
        }
      } catch (err) {
        console.error(`      ❌ Error reading file: ${err.message}`);
        continue;
      }

      // Clean the text (remove excessive newlines/spaces)
      const cleanText = rawText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (!cleanText) {
        console.log('      ❌ No text extracted. Skipping.');
        continue;
      }

      // Create Chunks
      const textChunks = chunkText(cleanText);
      console.log(`      ✂️  Generated ${textChunks.length} chunks`);

      if (textChunks.length === 0) continue;

      // Upload Chunks
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      let fileUploadedCount = 0;

      for (let i = 0; i < textChunks.length; i++) {
        const chunkContent = textChunks[i];
        
        try {
          const result = await model.embedContent(chunkContent);
          const embedding = result.embedding.values;

          const { error } = await supabase.from('documents').insert({
            content: chunkContent,
            metadata: {
              source: file,
              county: county,
              chunk_index: i,
              // We removed "page" because it was causing the bugs. 
              // We treat the file as a continuous stream of text.
            },
            embedding: embedding
          });

          if (error) throw error;
          fileUploadedCount++;
          
          // Rate limit helper
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (err) {
          console.error(`      ❌ Upload failed chunk ${i}: ${err.message}`);
        }
      }
      
      console.log(`      ✅ Uploaded ${fileUploadedCount}/${textChunks.length} chunks`);
      totalChunks += fileUploadedCount;
    }
  }

  console.log(`\n🎉 FINISHED. Total chunks in database: ${totalChunks}`);
}

uploadToSupabase();
