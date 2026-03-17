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
              size="sm"
              className="fixed top-6 right-6 z-50 h-10 px-4 rounded-full bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700 transition-all duration-300 border border-slate-200 dark:border-slate-700 shadow-sm font-medium text-slate-800 dark:text-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
            >
              <Sun className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 dark:hidden" />
              <span className="rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 dark:hidden">Light</span>

              <Moon className="h-4 w-4 mr-2 hidden rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-slate-400 dark:block" />
              <span className="hidden rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 dark:block">Dark</span>
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-slate-200 dark:border-slate-700">
            <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2 text-slate-800 dark:text-slate-300">
              <Sun className="h-4 w-4" />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2 text-slate-800 dark:text-slate-300">
              <Moon className="h-4 w-4" />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2 text-slate-800 dark:text-slate-300">
              <Monitor className="h-4 w-4" />
              <span>System</span>
              {theme === "system" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Left Side - Login Form */}
      <div className="flex-1 bg-slate-50 dark:bg-[#0a1628] flex items-center justify-center px-4 py-12 transition-colors duration-500">
        <div className="w-full max-w-lg -mt-28">
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
            <div className="text-center text-xs text-slate-500 dark:text-slate-500 mt-6 space-y-1">
              <p>© 2026 BRGY POBLACION PMS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-slate-50 dark:bg-[#0a1628] items-center justify-center p-12 relative overflow-hidden transition-colors duration-500">
        {/* Decorative Circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-slate-200/50 dark:bg-slate-800/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-slate-200/50 dark:bg-slate-800/50 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-200/30 dark:bg-slate-800/30 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-2xl text-center space-y-8">
          {/* Wallet Image */}
          <div className="relative h-80 flex items-center justify-center mb-12">
            <img 
              src="/undraw_wallet_diag.svg" 
              alt="Wallet Illustration" 
              className="w-full h-full max-w-md object-contain drop-shadow-2xl"
            />
          </div>

          {/* Text Content */}
          <div className="space-y-6">
            <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-700 mt-8">
              <p className="text-2xl text-slate-600 dark:text-slate-400 font-medium drop-shadow-md">
                Payroll Management System
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
