import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/signals/outcomes?ids=uuid1&ids=uuid2
// Returns id, outcome, outcome_notes for the requested signal IDs.
export async function GET(req: NextRequest) {
  const db = getSupabase();
  if (!db) return NextResponse.json([]);

  const ids = req.nextUrl.searchParams.getAll('ids').filter(Boolean);
  if (ids.length === 0) return NextResponse.json([]);

  const { data } = await db
    .from('signals')
    .select('id, outcome, outcome_notes')
    .in('id', ids);

  return NextResponse.json(data ?? []);
}
