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
    // 1. Load the local embeddings.json file
    const filePath = path.join(process.cwd(), 'public', 'documents', county, 'embeddings.json');
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ No embeddings found for ${county} at ${filePath}`);
      return [];
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const documents = JSON.parse(fileContent);

    // 2. Turn the user's question into numbers (embedding)
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;

    // 3. Compare the question to every document chunk
    const scoredDocs = documents.map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // 4. Sort by best match and return top K
    scoredDocs.sort((a, b) => b.score - a.score);
    
    return scoredDocs.slice(0, topK).map(doc => ({
      text: doc.text, // Ensure we map 'content' or 'text' correctly
      source: doc.source,
      page: doc.page,
      county: county,
      score: doc.score
    }));

  } catch (err) {
    console.error('Search failed:', err.message);
    return [];
  }
}
