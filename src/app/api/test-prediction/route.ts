import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';

export async function POST(_request: NextRequest) {
  try {
    const accountId = getAccountId();

    // Get the Polymarket source
    const { data: source, error: sourceError } = await supabaseAdmin
      .from('sources')
      .select('*')
      .eq('account_id', accountId)
      .eq('type', 'polymarket')
      .single();

    if (sourceError || !source) {
      return NextResponse.json({
        error: 'No Polymarket source found',
        sourceError,
        accountId
      }, { status: 404 });
    }

    // Try to insert a test prediction
    const testId = `test-${Date.now()}`;
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('content_items')
      .insert({
        account_id: accountId,
        source_id: source.id,
        topic_id: source.topic_id,
        type: 'prediction',
        title: 'Test Prediction - DELETE ME',
        summary: 'Yes: 50% | No: 50%',
        content: 'This is a test prediction to debug the insert issue',
        url: 'https://polymarket.com/test',
        author: 'Test',
        published_at: new Date().toISOString(),
        external_id: `polymarket:${testId}`,
        metadata: { test: true },
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: insertError,
        accountId,
        sourceId: source.id,
      });
    }

    return NextResponse.json({
      success: true,
      inserted: insertedData,
      accountId,
      sourceId: source.id,
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: String(error)
    }, { status: 500 });
  }
}
