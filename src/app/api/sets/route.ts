
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const setsCollection = dbAdmin.collection('pokemon-tcg-sets');
        const snapshot = await setsCollection.orderBy('releaseDate', 'desc').get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const sets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(sets);

    } catch (error: any) {
        console.error('Error fetching sets:', error);
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred while fetching sets.' },
            { status: 500 }
        );
    }
}
