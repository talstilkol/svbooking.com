import connectDB from '@/lib/db';

export async function GET() {
  let db = 'disconnected';
  try {
    await connectDB();
    db = 'connected';
  } catch {
    db = 'unavailable';
  }
  return Response.json({ status: 'ok', db, timestamp: new Date().toISOString() });
}
