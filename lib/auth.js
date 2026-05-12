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
    throw new AuthError('Unauthorized');
  }
  return user;
}

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
    this.status = 401;
  }
}
