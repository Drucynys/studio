import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const setsCollection = db.collection('pokemon-tcg-sets');
  const snapshot = await setsCollection.get();
  const found: Array<{ id: string; name?: string; logo?: string }> = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (doc.id.includes('P-A') || doc.id.includes('A3') || doc.id.toLowerCase().includes('pocket') || doc.id.includes('-a1') || doc.id.includes('-a2')) {
      found.push({ id: doc.id, name: data.name, logo: data.logo });
    }
  });
  return NextResponse.json({ count: found.length, sets: found });
}
