"use client"

import * as React from "react"
import { SSRSafe } from "@/components/ssr-safe"
import {
  Home,
  Clock,
  CreditCard,
  User,
  Calendar,
  Banknote,
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
} from "@/components/ui/sidebar"
import Link from "next/link"

// PMS Personnel Dashboard Data
const getNavData = (user?: { id?: string, name?: string | null, email?: string, avatar?: string | null }) => ({
  user: {
    id: user?.id,
    name: user?.name || "Personnel User",
    email: user?.email || "personnel@pms.com",
    avatar: user?.avatar || "",
  },
  navMain: [],
  projects: [],
})

interface PersonnelSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { id?: string, name?: string | null, email?: string, avatar?: string | null }
}

export function PersonnelSidebar({ user, ...props }: PersonnelSidebarProps) {
  const data = getNavData(user)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
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
          <NavUser user={data.user} role="personnel" />
        </SSRSafe>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarSeparator />

        {/* Main Dashboard */}
        <SidebarGroup key="personnel-main-v2">
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">Overview</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/personnel/dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Financial */}
        <SidebarGroup key="personnel-financial-v2">
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">Payroll</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu key="personnel-menu-fin-v2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/personnel/payroll">
                    <span className="flex items-center justify-center w-[18px] h-[18px] text-lg font-normal">₱</span>
                    <span>Payroll</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/personnel/loans">
                    <Banknote />
                    <span>Loans</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/personnel/deductions">
                    <CreditCard />
                    <span>Deductions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Attendance */}
        <SidebarGroup key="personnel-info-v2">
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">Attendance</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu key="personnel-menu-info-v2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/personnel/attendance">
                    <Clock />
                    <span>Attendance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Holidays */}
        <SidebarGroup key="personnel-holidays-v2">
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/80">Holidays</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu key="personnel-menu-holidays-v2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 font-medium [&>svg]:size-[18px]">
                  <Link href="/personnel/holidays">
                    <Calendar />
                    <span>Holidays</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden px-3 py-2 text-center border-t">
          <p className="text-xs font-medium">POBLACION - PMS</p>
          <p className="text-xs text-muted-foreground">© 2026 PMS. All rights reserved.</p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
