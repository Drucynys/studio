// This API route has been disabled as per the user's request.
// The Cardmarket price integration has been removed from the application.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'This feature is currently disabled.' }, { status: 404 });
}
