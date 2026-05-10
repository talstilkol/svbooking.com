import {LogoutLink} from "@kinde-oss/kinde-auth-nextjs/components";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <LogoutLink className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Sign out
          </LogoutLink>
        </div>
      </div>
    </div>
  )
}


          <LogoutLink> Sign out
          </LogoutLink>