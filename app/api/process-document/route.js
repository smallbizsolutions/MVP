import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { chunkText, generateEmbeddingsBatch, estimateTokens } from '../../../lib/embeddings';

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if already processed
    if (document.chunks_created) {
      return NextResponse.json({ 
        message: 'Document already processed',
        chunkCount: document.chunk_count 
      });
    }

    // Chunk the document
    const chunks = chunkText(document.content, 1000, 200);
    
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No content to process' }, { status: 400 });
    }

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddingsBatch(chunks);

    // Prepare chunk data for insertion
    const chunkData = chunks.map((chunk, index) => ({
      document_id: document.id,
      business_id: document.business_id,
      chunk_index: index,
      content: chunk,
      embedding: embeddings[index],
      token_count: estimateTokens(chunk),
    }));

    // Insert chunks in batches
    const batchSize = 50;
    for (let i = 0; i < chunkData.length; i += batchSize) {
      const batch = chunkData.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting chunks:', insertError);
        throw insertError;
      }
    }

    // Update document to mark as processed
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        chunks_created: true,
        chunk_count: chunks.length,
      })
      .eq('id', document.id);

    if (updateError) {
      console.error('Error updating document:', updateError);
    }

    return NextResponse.json({
      success: true,
      chunkCount: chunks.length,
      message: `Document processed into ${chunks.length} chunks`,
    });

  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}
