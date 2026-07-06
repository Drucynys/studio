// src/app/api/users/collection/export-csv/route.ts
import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import type { PokemonCard } from '@/types';

// Re-initialize Firebase Admin SDK and Auth if not already initialized
const authAdmin = auth;
const dbAdmin = db;
function convertToCsv(data: PokemonCard[]): string {
  if (data.length === 0) {
    return '';
  }

  // Explicitly define headers to control order and exclude unwanted columns
  const headers = ['name', 'set', 'cardNumber', 'quantity', 'variant', 'language', 'isFavorite'];

  const csvRows = data.map((row) => {
    return headers
      .map((fieldName) => {
        // Use a type-safe key access
        const key = fieldName as keyof PokemonCard;

        // This is the key fix: We are explicitly skipping the timestamp object.
        if (key === 'timestamp') {
          return ''; // Or a formatted date if needed, but for now we skip.
        }

        let cell = row[key];

        // Handle cases where a value might be null or undefined, including booleans
        if (cell === null || cell === undefined) {
          cell = '';
        } else if (typeof cell === 'boolean') {
          cell = cell ? 'true' : 'false';
        }

        let cellString = String(cell);

        // Escape quotes by doubling them, and wrap in quotes if it contains commas, quotes, or newlines
        if (cellString.search(/("|,|\n)/g) >= 0) {
          cellString = `"${cellString.replace(/"/g, '""')}"`;
        }
        return cellString;
      })
      .join(',');
  });

  return [headers.join(','), ...csvRows].join('\r\n');
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // *** FIX: Corrected the path to the user's sub-collection ***
    const collectionRef = dbAdmin.collection('users').doc(userId).collection('cards');
    const snapshot = await collectionRef.orderBy('timestamp', 'desc').get();

    if (snapshot.empty) {
      // To ensure a file is downloaded even if empty, send back headers with just the header row.
      const headers = new Headers();
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', 'attachment; filename="poketrkr_collection.csv"');
      const emptyCsv = 'name,set,cardNumber,quantity,variant,language,isFavorite';
      return new Response(emptyCsv, { status: 200, headers });
    }

    const collectionData = snapshot.docs.map((doc) => doc.data() as PokemonCard);
    const csvData = convertToCsv(collectionData);

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', 'attachment; filename="poketrkr_collection.csv"');

    return new Response(csvData, { status: 200, headers });
  } catch (error: any) {
    console.error(`[API] FATAL Error in export-csv:`, error);
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { message: error.message || 'An unknown server error occurred.' },
      { status: 500 }
    );
  }
}
