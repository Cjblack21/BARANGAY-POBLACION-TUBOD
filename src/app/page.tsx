"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Settings } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden flex">
      {/* Theme Toggle */}
      {mounted && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-6 right-6 z-50 h-10 w-10 rounded-full bg-slate-800/90 hover:bg-slate-700 transition-all duration-300 border border-slate-700"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-slate-400" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-slate-800/95 backdrop-blur-md border-slate-700">
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Moon className="h-4 w-4 text-slate-400" />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Monitor className="h-4 w-4 text-slate-500" />
              <span>System</span>
              {theme === "system" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Left Side - Login Form */}
      <div className="flex-1 bg-slate-50 dark:bg-[#0a1628] flex items-center justify-center px-4 py-12 transition-colors duration-500">
        <div className="w-full max-w-lg">
          <div className="flex flex-col items-center">
            {/* Logo */}
            <div className="flex justify-center mt-8">
              <img src="/BRGY PICTURE LOG TUBOD.png" alt="Barangay Logo" className="w-72 h-72 object-contain" />
            </div>

            {/* Title */}
            <div className="text-center -mt-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                BRGY POBLACION PMS
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Sign in to continue to your account
              </p>
            </div>

            {/* Login Card */}
            <div className="w-full bg-white dark:bg-white/10 dark:backdrop-blur-xl rounded-2xl p-10 border border-slate-200 dark:border-white/20 shadow-xl">
              <LoginForm />
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500 dark:text-slate-500">
              © 2026 PMS. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-amber-500 items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-2xl text-center space-y-8">
          {/* Animated Gears */}
          <div className="relative h-64 flex items-center justify-center mb-12">
            {/* Large Gear - Center */}
            <Settings className="absolute w-48 h-48 text-white animate-spin-slow drop-shadow-2xl" style={{ animationDuration: '10s' }} />

            {/* Medium Gear - Top Right */}
            <Settings className="absolute w-32 h-32 text-white/90 top-4 right-20 animate-spin-slow drop-shadow-xl" style={{ animationDuration: '7s', animationDirection: 'reverse' }} />

            {/* Small Gear - Bottom Left */}
            <Settings className="absolute w-24 h-24 text-white/85 bottom-8 left-16 animate-spin-slow drop-shadow-xl" style={{ animationDuration: '6s' }} />
          </div>

          {/* Text Content */}
          <div className="space-y-6">
            <h2 className="text-6xl font-bold text-white leading-tight drop-shadow-lg">
              BARANGAY POBLACION
            </h2>
            <p className="text-3xl font-semibold text-white/95 drop-shadow-md">
              Tubod, Lanao del Norte
            </p>
            <div className="pt-4 border-t-2 border-white/30 mt-8">
              <p className="text-2xl text-white/90 font-medium drop-shadow-md">
                Payroll Management System
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
