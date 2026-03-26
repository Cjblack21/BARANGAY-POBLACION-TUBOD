import { Suspense } from 'react'
import { UserManagement } from '@/components/user-management'
import { Users, Landmark, User } from 'lucide-react'

export default function UserManagementPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Landmark className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 -ml-1" />
            </span>
            Brgy Staff & Officials
          </h2>
          <p className="text-muted-foreground">Manage Barangay Officials and Staff accounts, roles, and information</p>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <UserManagement />
      </Suspense>
    </div>
  )
}

