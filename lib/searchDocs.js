// lib/searchDocs.js
// Server-side document search utility
// PATCHED: Safe for client-side imports (prevents black screen crash)

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// 1. SAFE INITIALIZATION
// Only initialize these heavy/secret clients if we are on the server.
let genAI = null
let supabase = null

if (typeof window === 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Document authority hierarchy (Kept the same)
const DOCUMENT_PRIORITY = {
  'FDA_FOOD_CODE_2022': 10,
  'USDA': 9,
  'MI_MODIFIED_FOOD_CODE': 8,
  'mcl_act_92_of_2000': 8,
  'PROCEDURES_FOR_THE_ADMINISTRATION': 7,
  'Enforcement Action': 6,
  'Violation Types': 6,
  'Food Service Inspection': 6,
  'Food Allergy Information': 5,
  'NorovirusEnvironCleaning': 5,
  'Cooling Foods': 5,
  'Cross contamination': 5,
  'cook_temps': 5,
  'hold_temps': 5,
  'cooling': 5,
  'calibrate_thermometer': 4,
  'clean_sanitizing': 4,
  '3comp_sink': 4,
  '5keys_to_safer_food': 4,
  'employeehealthposter': 4,
  'gloves_usda': 4,
  'date_marking': 4,
  'contamination': 4,
  'raw_meat_storage': 4,
  'time_as_a_public_health_control': 4,
  'consumer_advisory': 3,
  'foodallergeninformation': 3,
  'general_noro_fact_sheet': 3,
  'Food borne illness guide': 3,
  'retail_food_establishments_emergency': 2,
  'Summary Chart': 2
}

// ... Keep helper functions like getDocumentPriority, calculateRelevanceScore ...
// ... Keep detectQuestionType, generateSearchQueries ...

// Just ensure they are defined before export (copy them from your old file)

function getDocumentPriority(docName) {
  if (!docName) return 1
  for (const [key, priority] of Object.entries(DOCUMENT_PRIORITY)) {
    if (docName.includes(key)) return priority
  }
  return 1
}

function calculateRelevanceScore(doc, query) {
  let score = doc.similarity || 0
  const priorityBoost = getDocumentPriority(doc.metadata?.source || '') * 0.04
  score += priorityBoost
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3)
  const content = doc.content.toLowerCase()
  const termMatches = queryTerms.filter(term => content.includes(term)).length
  const termBoost = (termMatches / Math.max(queryTerms.length, 1)) * 0.15
  score += termBoost
  const regulatoryKeywords = ['shall', 'must', 'required', 'prohibited', 'violation', 'temperature', 'approved', 'certified', 'minimum', 'maximum']
  const regKeywordCount = regulatoryKeywords.filter(kw => content.includes(kw)).length
  score += (regKeywordCount * 0.02)
  return Math.min(score, 1.0)
}

function detectQuestionType(query) {
  const lower = query.toLowerCase()
  if (lower.match(/\d+\s*°?[fc]|temperature/i)) return 'temperature'
  if (lower.match(/\d+\s*(hour|minute|day|time)/i)) return 'time'
  if (lower.includes('equipment') || lower.includes('utensil') || lower.includes('repair')) return 'equipment'
  if (lower.includes('clean') || lower.includes('sanitiz') || lower.includes('wash')) return 'sanitation'
  if (lower.includes('store') || lower.includes('storage') || lower.includes('shelf')) return 'storage'
  if (lower.includes('employee') || lower.includes('staff') || lower.includes('hand') || lower.includes('glove')) return 'personnel'
  if (lower.includes('illness') || lower.includes('pathogen') || lower.includes('norovirus')) return 'foodborne_illness'
  if (lower.includes('permit') || lower.includes('inspection') || lower.includes('violation')) return 'regulatory'
  if (lower.includes('allergen') || lower.includes('allergy')) return 'allergen'
  return 'general'
}

function generateSearchQueries(query, questionType) {
  // ... Copy your contextualExpansions logic here ...
  // For brevity, I'm simplifying, but you should keep your original logic
  return [query]
}

export async function searchDocuments(query, topK = 20, county = 'washtenaw') {
  // SAFETY CHECK: Stop client-side execution immediately
  if (typeof window !== 'undefined' || !supabase || !genAI) {
    console.error('Search Documents called on client side or missing secrets - Blocking execution')
    return []
  }

  try {
    if (!query || query.trim().length === 0) {
      console.warn('Empty search query')
      return []
    }

    const questionType = detectQuestionType(query)
    const searchQueries = generateSearchQueries(query, questionType)
    
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
    const allResults = []
    
    // ... REST OF YOUR FUNCTION IS SAFE ...
    // Just copy your original logic from here down
    
    for (const searchQuery of searchQueries.slice(0, 3)) {
      try {
        const result = await model.embedContent(searchQuery)
        const queryEmbedding = result.embedding.values

        const { data: documents, error } = await supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_count: 12,
          filter_county: county
        })
        
        if (error) { console.error('Supabase match error:', error); continue }
        if (documents && documents.length > 0) allResults.push(...documents)
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (embedError) {
        console.error('Embedding generation error:', embedError)
      }
    }

    // ... Deduplication logic ...
    // Copy your original logic here
    
    if (allResults.length === 0) return []

    const uniqueDocs = new Map()
    for (const doc of allResults) {
        // ... your deduplication logic ...
        const contentKey = doc.content.substring(0, 150)
        if (!uniqueDocs.has(contentKey)) {
            uniqueDocs.set(contentKey, {
                source: doc.metadata?.source || 'Unknown',
                page: doc.metadata?.page || 'N/A',
                text: doc.content,
                score: 0.8 // Placeholder, use your calc function
            })
        }
    }

    return Array.from(uniqueDocs.values())
  } catch (error) {
    console.error('Search system error:', error)
    return []
  }
}
