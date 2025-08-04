
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const setsCollection = dbAdmin.collection('pokemon-tcg-sets');
        const snapshot = await setsCollection.count().get();
        const count = snapshot.data().count;

        return NextResponse.json({ count });
    } catch (error: any) {
        console.error('Error fetching set count:', error);
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred while fetching the set count.' },
            { status: 500 }
        );
    }
}
