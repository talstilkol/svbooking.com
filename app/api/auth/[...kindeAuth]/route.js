export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { handleAuth } = await import("@kinde-oss/kinde-auth-nextjs/server");
  const handler = handleAuth();
  return handler(request);
}
