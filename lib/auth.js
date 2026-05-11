import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export async function getCurrentUser() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const authed = await isAuthenticated();
  if (!authed) return null;
  return await getUser();
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return user;
}
