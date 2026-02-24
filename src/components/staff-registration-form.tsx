"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
    User,
    Upload,
    Lock,
    Shield,
    Briefcase,
    Eye,
    EyeOff,
    UserPlus,
    CheckCircle2,
    MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "react-hot-toast"

interface PersonnelType {
    personnel_types_id: string
    name: string
    type?: "TEACHING" | "NON_TEACHING" | null
    department?: string | null
}

interface FormData {
    email: string
    name: string
    password: string
    confirmPassword: string
    personnel_types_id: string
    streetAddress: string
    barangay: string
    purok: string
    zipCode: string
}

function AutoRedirect({ router }: { router: ReturnType<typeof useRouter> }) {
    const [count, setCount] = useState(3)

    useEffect(() => {
        if (count <= 0) {
            router.push("/")
            return
        }
        const t = setTimeout(() => setCount(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [count, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
            <div className="w-full max-w-sm text-center space-y-5">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Registration Successful</h2>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
                        Your account has been created. Redirecting to login in {count}s...
                    </p>
                </div>
                <Button onClick={() => router.push("/")} className="w-full h-11 text-base">
                    Go to Login
                </Button>
            </div>
        </div>
    )
}

export function StaffRegistrationForm() {
    const router = useRouter()
    const [personnelTypes, setPersonnelTypes] = useState<PersonnelType[]>([])
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const [formData, setFormData] = useState<FormData>({
        email: "",
        name: "",
        password: "",
        confirmPassword: "",
        personnel_types_id: "",
        streetAddress: "",
        barangay: "",
        purok: "",
        zipCode: "",
    })

    useEffect(() => {
        ; (async () => {
            try {
                const res = await fetch("/api/admin/personnel-types", { cache: "no-store" })
                if (res.ok) {
                    const data = await res.json()
                    setPersonnelTypes(data)
                }
            } catch (err) {
                console.error("Failed to load personnel types", err)
            }
        })()
    }, [])

    const generatePersonnelId = () =>
        Math.floor(100000 + Math.random() * 900000).toString()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.email || !formData.email.includes("@")) {
            toast.error("Please enter a valid email address")
            return
        }
        if (!formData.name.trim()) {
            toast.error("Please enter your full name")
            return
        }
        if (!formData.password || formData.password.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        setIsSubmitting(true)

        try {
            let avatarUrl: string | null = null
            if (avatarFile) {
                const avatarFormData = new FormData()
                avatarFormData.append("avatar", avatarFile)
                const uploadRes = await fetch("/api/admin/upload-avatar", {
                    method: "POST",
                    body: avatarFormData,
                })
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json()
                    avatarUrl = uploadData.avatarUrl
                }
            }

            const users_id = generatePersonnelId()

            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    users_id,
                    email: formData.email,
                    name: formData.name,
                    password: formData.password,
                    role: "PERSONNEL",
                    isActive: true,
                    personnel_types_id: formData.personnel_types_id || undefined,
                    streetAddress: formData.streetAddress || undefined,
                    barangay: formData.barangay || undefined,
                    purok: formData.purok || undefined,
                    zipCode: formData.zipCode || undefined,
                    avatar: avatarUrl || undefined,
                }),
            })

            if (!res.ok) {
                let message = "Failed to register"
                try {
                    const data = await res.json()
                    if (data.details && Array.isArray(data.details)) {
                        message = data.details
                            .map((d: { path: string[]; message: string }) => `${d.path.join(".")}: ${d.message}`)
                            .join(", ")
                    } else {
                        message = data.error || message
                    }
                } catch { /* ignore */ }
                toast.error(message)
                return
            }

            setSubmitted(true)
            toast.success("Registration successful!")
        } catch (err) {
            console.error(err)
            toast.error("An unexpected error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <AutoRedirect router={router} />
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950 py-10 px-4">
            <div className="w-full max-w-2xl mx-auto">

                {/* Logo & Title */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                            src="/brgy-logo.png"
                            alt="Barangay Logo"
                            fill
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Registration</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Barangay Poblacion Payroll Management System
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm">
                    <form onSubmit={handleSubmit}>
                        <div className="p-6 sm:p-8 space-y-8">

                            {/* ── Profile Photo ── */}
                            <div>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Profile Photo
                                    <span className="text-xs font-normal text-gray-400">(Optional)</span>
                                </h3>
                                <div className="flex flex-col sm:flex-row items-center gap-5">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Avatar"
                                            className="h-24 w-24 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                                            <User className="h-9 w-9 text-gray-400" />
                                        </div>
                                    )}
                                    <Label htmlFor="reg-avatar" className="cursor-pointer flex-1 w-full">
                                        <div className="border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center">
                                            <Input
                                                id="reg-avatar"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        setAvatarFile(file)
                                                        const reader = new FileReader()
                                                        reader.onloadend = () => setAvatarPreview(reader.result as string)
                                                        reader.readAsDataURL(file)
                                                    }
                                                }}
                                            />
                                            <Upload className="h-6 w-6 text-gray-500 mx-auto mb-1.5" />
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload photo</p>
                                            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or GIF (max 5MB)</p>
                                        </div>
                                    </Label>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* ── Personal Information ── */}
                            <div>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Personal Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <Label htmlFor="reg-name" className="text-sm font-medium">Full Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="reg-name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Juan Dela Cruz"
                                            className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="reg-email" className="text-sm font-medium">Email Address <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="reg-email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="e.g., juan@example.com"
                                            className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* ── Address Information ── */}
                            <div>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Address Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="reg-street" className="text-sm font-medium">Street Address</Label>
                                        <Input
                                            id="reg-street"
                                            value={formData.streetAddress}
                                            onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                            placeholder="e.g., 123 Rizal Street"
                                            className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="reg-barangay" className="text-sm font-medium">Barangay</Label>
                                        <Input
                                            id="reg-barangay"
                                            value={formData.barangay}
                                            onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                                            placeholder="e.g., Poblacion"
                                            className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="reg-purok" className="text-sm font-medium">Purok</Label>
                                        <Input
                                            id="reg-purok"
                                            value={formData.purok}
                                            onChange={(e) => setFormData({ ...formData, purok: e.target.value })}
                                            placeholder="e.g., Purok 1"
                                            className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="reg-zipcode" className="text-sm font-medium">Zip Code</Label>
                                        <Input
                                            id="reg-zipcode"
                                            value={formData.zipCode}
                                            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                            placeholder="e.g., 9209"
                                            className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* ── Account Credentials ── */}
                            <div>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    Account Credentials
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <Label htmlFor="reg-password" className="text-sm font-medium">Password <span className="text-red-500">*</span></Label>
                                        <div className="relative mt-1.5">
                                            <Input
                                                id="reg-password"
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="Minimum 6 characters"
                                                className="h-11 pr-10 border-gray-400 dark:border-gray-600 text-base"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                                            <Shield className="h-3 w-3" /> At least 6 characters
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="reg-confirm" className="text-sm font-medium">Confirm Password <span className="text-red-500">*</span></Label>
                                        <div className="relative mt-1.5">
                                            <Input
                                                id="reg-confirm"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                placeholder="Re-enter password"
                                                className="h-11 pr-10 border-gray-400 dark:border-gray-600 text-base"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                            <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            {/* ── Role & Position ── */}
                            <div>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    Role &amp; Position
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* System Role — fixed as Staff Member */}
                                    <div>
                                        <Label className="text-sm font-medium">System Role</Label>
                                        <Input
                                            value="Staff Member"
                                            readOnly
                                            className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    {/* BLGU & Position */}
                                    <div>
                                        <Label className="text-sm font-medium">BLGU &amp; Position</Label>
                                        <Select
                                            value={formData.personnel_types_id}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, personnel_types_id: value })
                                            }
                                        >
                                            <SelectTrigger className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base">
                                                <SelectValue placeholder="Select position" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {personnelTypes.map((type) => {
                                                    const parts = type.name.split(": ")
                                                    const office = parts.length === 2 ? parts[0] : (type.department || "N/A")
                                                    const position = parts.length === 2 ? parts[1] : type.name
                                                    return (
                                                        <SelectItem key={type.personnel_types_id} value={type.personnel_types_id}>
                                                            {office} - {position}
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Pending Salary — read-only */}
                                    <div>
                                        <Label className="text-sm font-medium">Salary</Label>
                                        <Input
                                            value="Pending"
                                            readOnly
                                            className="mt-1.5 h-11 border-gray-400 dark:border-gray-600 text-base bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-400 mt-1.5">Salary will be assigned by the administrator</p>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 dark:border-gray-700 px-6 sm:px-8 py-5 flex justify-end">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:w-auto h-11 px-8 text-base gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4" />
                                        Create Account
                                    </>
                                )}
                            </Button>
                        </div>

                    </form>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">© 2026 Barangay Poblacion PMS</p>
            </div>
        </div>
    )
}
