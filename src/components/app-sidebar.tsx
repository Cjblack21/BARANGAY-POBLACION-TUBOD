"use client"

import * as React from "react"
import { SSRSafe } from "@/components/ssr-safe"
import {
  Home,
  Users,
  Calendar as CalendarIcon,
  BadgeMinus,
  BadgePlus,
  ShieldCheck,
  Clock,
  Archive,
  Banknote,
  Settings,
  FileText,
  Calendar,
  Database,
  UserCheck,
  Minus,
  Plus,
  BarChart3,
  ClipboardMinus,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"

// PMS Admin Dashboard Data - this will be made dynamic
const getNavData = (user?: { id?: string, name?: string | null, email?: string, avatar?: string | null }) => ({
  user: {
    id: user?.id,
    name: user?.name || "System Administrator",
    email: user?.email || "admin@pms.com",
    avatar: user?.avatar || "",
  },
  navMain: [],
  projects: [],
})

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { id?: string, name?: string | null, email?: string, avatar?: string | null }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const data = getNavData(user)
  const [mounted, setMounted] = React.useState(false)
  const [hasNotification, setHasNotification] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    // Check localStorage on mount
    setHasNotification(localStorage.getItem('hasNewArchivedPayroll') === 'true')

    // Listen for storage changes
    const handleStorageChange = () => {
      setHasNotification(localStorage.getItem('hasNewArchivedPayroll') === 'true')
    }
    window.addEventListener('storage', handleStorageChange)

    // Also check periodically in case localStorage changes in same tab
    const interval = setInterval(handleStorageChange, 500)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  if (!mounted) return null

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 pt-7 pb-2 group-data-[collapsible=icon]:justify-center">
              <div className="flex aspect-square size-16 items-center justify-center rounded-lg">
                <img
                  src="/BRGY PICTURE LOG TUBOD.png"
                  alt="Barangay Logo"
                  className="h-16 w-16 object-contain"
                />
              </div>
              <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-0.5 leading-none">
                <span className="font-bold text-lg">POBLACION - PMS</span>
                <span className="text-sm text-muted-foreground">Welcome to PMS</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="group-data-[collapsible=icon]:hidden px-3 py-2 mt-2">
          <p className="text-xs font-medium text-muted-foreground">Account</p>
        </div>
        <SSRSafe>
          <NavUser user={data.user} role="admin" />
        </SSRSafe>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarSeparator />

        {/* Main Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">Overview</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Payroll Operations */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">Payroll Operations</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/payroll" className="relative">
                    <span className="flex items-center justify-center w-[18px] h-[18px] text-lg font-normal">₱</span>
                    <span className="flex items-center gap-1.5">
                      <span>Payroll</span>
                      {hasNotification && (
                        <span className="flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600"></span>
                        </span>
                      )}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/loans">
                    <Banknote />
                    <span>Loans</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/personal-deductions">
                    <BadgeMinus />
                    <span>Staff Deductions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/deductions">
                    <ShieldCheck />
                    <span>Mandatory Deductions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/add-pay">
                    <BadgePlus />
                    <span>Add Pay</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/attendance-deduction">
                    <ClipboardMinus />
                    <span>Attendance Deduction</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* User Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">Staff Management</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/user-management">
                    <Users />
                    <span>Brgy Staff</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/personnel-types">
                    <UserCheck />
                    <span>Brgy Position</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Holidays */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">Holidays</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/holidays">
                    <Calendar />
                    <span>Holidays</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* System Settings */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">System Settings</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/admin/header-settings">
                    <FileText />
                    <span>Header Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


      </SidebarContent>
      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden px-3 py-2 text-center border-t">
          <p className="text-xs font-semibold">BRGY POBLACION-PMS</p>
          <p className="text-xs text-muted-foreground mt-1">© 2026 All rights reserved.</p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
