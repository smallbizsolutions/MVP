// scripts/upload-to-supabase.js
// This script processes PDFs from county folders and uploads embeddings to Supabase
// Run: node scripts/upload-to-supabase.js

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COUNTIES = ['washtenaw', 'wayne', 'oakland'];

async function uploadToSupabase() {
  console.log('🚀 Starting multi-county document upload to Supabase...\n');
  
  const documentsDir = path.join(process.cwd(), 'public', 'documents');
  
  if (!fs.existsSync(documentsDir)) {
    console.error('❌ Documents directory not found:', documentsDir);
    process.exit(1);
  }
  
  let totalChunks = 0;
  let uploadedChunks = 0;
  
  // Clear existing documents
  console.log('🗑️  Clearing existing documents...');
  const { error: deleteError } = await supabase.from('documents').delete().neq('id', 0);
  if (deleteError) {
    console.log('⚠️  Could not clear existing documents:', deleteError.message);
  } else {
    console.log('✅ Cleared existing documents\n');
  }
  
  // Process each county
  for (const county of COUNTIES) {
    const countyDir = path.join(documentsDir, county);
    
    if (!fs.existsSync(countyDir)) {
      console.log(`⚠️  Skipping ${county} - directory not found\n`);
      continue;
    }
    
    console.log(`\n📍 Processing ${county.toUpperCase()} COUNTY\n${'='.repeat(50)}`);
    
    const files = fs.readdirSync(countyDir);
    
    for (const file of files) {
      if (file === 'keep.txt' || file.startsWith('.')) continue;
      
      console.log(`📄 Processing: ${file}`);
      const filePath = path.join(countyDir, file);
      let text = '';
      let pdfData = null;
      
      // Extract text
      try {
        if (file.endsWith('.txt')) {
          text = fs.readFileSync(filePath, 'utf-8');
        } else if (file.endsWith('.pdf')) {
          const dataBuffer = fs.readFileSync(filePath);
          pdfData = await pdf(dataBuffer);
          text = pdfData.text;
        }
      } catch (err) {
        console.error(`   ⚠️  Failed to read ${file}:`, err.message);
        continue;
      }
      
      // For PDFs, process page by page to maintain page numbers
      const fileChunks = [];
      
      if (file.endsWith('.pdf') && pdfData) {
        // Process each page
        for (let pageNum = 1; pageNum <= pdfData.numpages; pageNum++) {
          try {
            // Re-parse to get individual page
            const dataBuffer = fs.readFileSync(filePath);
            const pageData = await pdf(dataBuffer, {
              pagerender: (pageData) => {
                if (pageData.pageNumber === pageNum) {
                  return pageData.getTextContent();
                }
              }
            });
            
            // Get text for this page
            const pageText = pageData.text.split('\n\n')[pageNum - 1] || '';
            
            if (pageText.trim().length < 50) continue; // Skip near-empty pages
            
            // Split long pages into chunks (500 words)
            const words = pageText.split(/\s+/);
            
            for (let i = 0; i < words.length; i += 500) {
              const chunk = words.slice(i, i + 500).join(' ');
              if (chunk.trim().length < 100) continue;
              
              fileChunks.push({
                source: file,
                county: county,
                text: chunk.trim(),
                page: pageNum,
                chunkIndex: Math.floor(i / 500),
                wordCount: Math.min(500, words.length - i)
              });
            }
          } catch (err) {
            console.error(`   ⚠️  Failed to process page ${pageNum}:`, err.message);
          }
        }
      } else {
        // For text files, split into chunks without page numbers
        const words = text.split(/\s+/);
        for (let i = 0; i < words.length; i += 500) {
          const chunk = words.slice(i, i + 500).join(' ');
          if (chunk.trim().length < 100) continue;
          
          fileChunks.push({
            source: file,
            county: county,
            text: chunk.trim(),
            page: null,
            chunkIndex: Math.floor(i / 500),
            wordCount: Math.min(500, words.length - i)
          });
        }
      }
      
      console.log(`   📊 Created ${fileChunks.length} chunks`);
      totalChunks += fileChunks.length;
      
      // Generate embeddings and upload to Supabase
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      
      for (let i = 0; i < fileChunks.length; i++) {
        const chunk = fileChunks[i];
        
        try {
          // Generate embedding
          const result = await model.embedContent(chunk.text);
          const embedding = result.embedding.values;
          
          // Upload to Supabase with county and page metadata
          const { error: insertError } = await supabase
            .from('documents')
            .insert({
              content: chunk.text,
              metadata: {
                source: chunk.source,
                county: chunk.county,
                page: chunk.page,
                chunk_index: chunk.chunkIndex,
                word_count: chunk.wordCount
              },
              embedding: embedding
            });
          
          if (insertError) {
            console.error(`   ❌ Failed to upload chunk ${i}:`, insertError.message);
          } else {
            uploadedChunks++;
          }
          
          // Progress indicator
          if ((i + 1) % 5 === 0) {
            console.log(`   ⏳ Progress: ${i + 1}/${fileChunks.length} chunks uploaded`);
          }
          
          // Rate limiting
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          console.error(`   ❌ Error on chunk ${i}:`, err.message);
        }
      }
      
      console.log(`   ✅ Completed ${file}\n`);
    }
  }
  
  console.log('\n🎉 Upload complete!');
  console.log(`📊 Total chunks processed: ${totalChunks}`);
  console.log(`✅ Successfully uploaded: ${uploadedChunks}`);
  console.log(`❌ Failed: ${totalChunks - uploadedChunks}`);
  
  // Verify upload
  console.log('\n📚 Database Summary:');
  for (const county of COUNTIES) {
    const { count, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .filter('metadata->>county', 'eq', county);
    
    if (!countError) {
      console.log(`   ${county.charAt(0).toUpperCase() + county.slice(1)} County: ${count} chunks`);
    }
  }
  
  const { count: totalCount, error: totalError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  
  if (!totalError) {
    console.log(`   Total: ${totalCount} chunks`);
  }
}

uploadToSupabase().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
