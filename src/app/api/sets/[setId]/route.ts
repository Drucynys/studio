
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

export async function GET(request: Request, { params }: { params: { setId: string } }) {
    const { setId } = params;
    if (!setId) {
        return NextResponse.json({ message: 'Set ID is required' }, { status: 400 });
    }

    try {
        const setRef = dbAdmin.collection('pokemon-tcg-sets').doc(setId);
        const doc = await setRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'Set not found in database' }, { status: 404 });
        }

        return NextResponse.json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
        console.error(`Error fetching set ${setId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
