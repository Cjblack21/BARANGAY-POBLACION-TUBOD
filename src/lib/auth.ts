import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { users_role } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture, // Explicitly map the picture field
          role: 'PERSONNEL' as const, // Default role for OAuth users
        }
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials")
          return null
        }

        try {
          const inputEmailOrId = credentials.email.trim().toLowerCase()
          const inputPassword = credentials.password.trim()
          console.log("Attempting to authenticate user:", inputEmailOrId)

          // Try to find user by email first
          let user = await prisma.users.findUnique({
            where: {
              email: inputEmailOrId
            }
          })

          // If not found and input looks like an ID, try to find by users_id
          if (!user && !inputEmailOrId.includes('@')) {
            user = await prisma.users.findUnique({
              where: {
                users_id: inputEmailOrId
              }
            })
          }

          if (!user) {
            console.log("User not found:", inputEmailOrId)
            return null
          }

          if (!user.isActive) {
            console.log("User account is inactive:", inputEmailOrId)
            return null
          }

          if (!user.password) {
            console.log("No password set for user (OAuth-only account):", inputEmailOrId)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            inputPassword,
            user.password
          )

          if (!isPasswordValid) {
            console.log("Invalid password for user:", inputEmailOrId)
            return null
          }

          console.log("Authentication successful for user:", inputEmailOrId)
          return {
            id: user.users_id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
          }
        } catch (error) {
          console.error("Auth error:", error)
          // Return null instead of throwing to prevent JSON parsing errors
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Only require email verification
        const googleProfile = profile as any
        return googleProfile?.email_verified === true
      }
      return true // Allow other providers (credentials)
    },
    async jwt({ token, user, account, profile, trigger }) {
      // Only hit the DB on initial sign-in or when explicitly triggered
      if (account?.provider === "google" && profile) {
        const googleProfile = profile as any

        try {
          const existingUser = await Promise.race([
            prisma.users.findUnique({
              where: { email: googleProfile.email as string }
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
          ]) as any

          if (existingUser) {
            token.role = existingUser.role
            token.userId = existingUser.users_id
            token.avatar = existingUser.avatar
            token.picture = googleProfile.picture
          } else {
            token.role = "SETUP_REQUIRED"
            token.email = googleProfile.email
            token.name = googleProfile.name
            token.picture = googleProfile.picture
          }
        } catch (error) {
          console.error("Error checking user in JWT callback:", error)
          token.role = "SETUP_REQUIRED"
          token.email = googleProfile.email
          token.name = googleProfile.name
          token.picture = googleProfile.picture
        }
      } else if (user) {
        // Credentials sign-in — store user data in token once
        token.role = user.role
        token.userId = user.id
        token.avatar = user.avatar
      } else if (trigger === "update" && token.userId) {
        // Only refresh avatar when explicitly triggered (e.g. profile update)
        try {
          const freshUser = await prisma.users.findUnique({
            where: { users_id: token.userId as string },
            select: { avatar: true }
          })
          if (freshUser) token.avatar = freshUser.avatar
        } catch (error) {
          console.error("Error refreshing avatar:", error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        const userId = (token.userId as string) || (token.sub as string) || ''
        session.user.id = userId
        session.user.role = token.role as users_role || 'SETUP_REQUIRED'
        session.user.avatar = token.avatar as string || null

        if (token.role === "SETUP_REQUIRED") {
          session.user.email = token.email as string || ''
          session.user.name = token.name as string || ''
          session.user.image = token.picture as string || ''
        } else {
          session.user.image = token.avatar as string || null
        }
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl })

      // If user needs setup, redirect to account setup page
      if (url.includes("/account-setup")) {
        // If url is already absolute, return as is
        if (url.startsWith("http")) return url
        // If url is relative, prepend baseUrl
        return `${baseUrl}${url}`
      }

      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`

      // Allows callback URLs on the same origin
      if (url.startsWith("http")) {
        try {
          const urlObj = new URL(url)
          if (urlObj.origin === baseUrl) return url
        } catch (error) {
          console.error("Invalid URL in redirect:", error)
        }
      }

      return baseUrl
    }
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
}

// Types for NextAuth
declare module "next-auth" {
  interface User {
    role: users_role | "SETUP_REQUIRED"
    avatar?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      avatar?: string | null
      role: users_role | "SETUP_REQUIRED"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: users_role | "SETUP_REQUIRED"
    userId?: string
    email?: string
    name?: string
    picture?: string
    avatar?: string | null
  }
}
