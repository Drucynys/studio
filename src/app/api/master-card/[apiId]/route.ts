import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

export async function GET(
    request: Request,
    context: { params: { apiId: string } }
) {
    const { apiId } = context.params;
    if (!apiId) {
        return NextResponse.json({ message: 'Card API ID is required' }, { status: 400 });
    }

    try {
        const cardRef = dbAdmin.collection('pokemon-tcg-cards').doc(apiId);
        const docSnap = await cardRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ message: 'Card not found in master database. It may not have been synced yet.' }, { status: 404 });
        }

        return NextResponse.json(docSnap.data());
    } catch (error: any) {
        console.error(`Error fetching master card ${apiId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
