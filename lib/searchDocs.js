import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function for cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchDocuments(query, topK = 20, county = 'washtenaw') {
  try {
    // 1. Load the single combined embeddings file you just created
    const filePath = path.join(process.cwd(), 'public', 'embeddings.json');
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ embeddings.json not found at ${filePath}`);
      return [];
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const allDocuments = JSON.parse(fileContent);

    // 2. Filter the big file for ONLY the requested county
    const documents = allDocuments.filter(doc => {
        // Handle different possible structures (metadata.county or root county)
        const docCounty = doc.county || (doc.metadata && doc.metadata.county);
        return docCounty && docCounty.toLowerCase() === county.toLowerCase();
    });

    if (documents.length === 0) {
        console.log(`found 0 documents for county: ${county}`);
        return [];
    }

    // 3. Embed the query
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;

    // 4. Score and Sort
    const scoredDocs = documents.map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    scoredDocs.sort((a, b) => b.score - a.score);
    
    return scoredDocs.slice(0, topK).map(doc => ({
      text: doc.text || doc.content, 
      source: doc.source || (doc.metadata && doc.metadata.source) || 'Unknown',
      page: doc.page || (doc.metadata && doc.metadata.page) || 'N/A',
      county: county,
      score: doc.score
    }));

  } catch (err) {
    console.error('Search failed:', err.message);
    return [];
  }
}
