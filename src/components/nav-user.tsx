"use client"

import {
  User,
  ChevronsUpDown,
  LogOut,
  KeyRound,
  Settings,
} from "lucide-react"
import { signOut } from "next-auth/react"
import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

function getInitials(name: string): string {
  if (!name) return 'U';
  return name.split(' ').filter(Boolean).map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase() || 'U';
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
  role = "personnel",
}: {
  user: {
    id?: string
    name: string
    email: string
    avatar: string
  }
  role?: "personnel" | "admin"
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const profilePath = role === "admin" ? "/admin/profile" : "/personnel/profile"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-14"
            >
              <Avatar className="h-10 w-10 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-slate-800 text-white dark:bg-slate-800 dark:text-white">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-sm text-muted-foreground">{user.id}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[260px] min-w-[260px] rounded-xl shadow-lg border p-1"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-slate-800 text-white dark:bg-slate-800 dark:text-white">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-[15px]">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  <span className="truncate text-xs text-muted-foreground">ID: {user.id}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="p-2.5 text-[15px] cursor-pointer focus:bg-accent focus:text-accent-foreground">
                <Link href={profilePath} onClick={() => setOpenMobile(false)}>
                  <User className="mr-3 h-4 w-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="p-2.5 text-[15px] cursor-pointer focus:bg-accent focus:text-accent-foreground">
                <Link href={`${profilePath}?tab=settings`} onClick={() => setOpenMobile(false)}>
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="p-2.5 text-[15px] cursor-pointer focus:bg-accent focus:text-accent-foreground">
                <Link href={`${profilePath}?tab=security`} onClick={() => setOpenMobile(false)}>
                  <KeyRound className="mr-3 h-4 w-4" />
                  Change Password
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="p-2.5 text-[15px] font-medium text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer transition-colors"
              onClick={() => { setOpenMobile(false); signOut({ callbackUrl: "/" }) }}
            >
              <LogOut className="mr-3 h-4 w-4 text-red-600" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
