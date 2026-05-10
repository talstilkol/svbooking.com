import {LoginLink} from "@kinde-oss/kinde-auth-nextjs/components";

export default function Profile() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-8">Profile Page</h1>
        <LoginLink className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Sign in to access your profile
        </LoginLink>
      </div>
    </div>
  )
}
