'use server'

import { prisma } from '@/lib/prisma'
import { users_role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createUserAccount(data: {
  email: string
  name: string
  schoolId: string
  personnelTypeId?: string
  department?: string
  image?: string
}): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Check if school ID is already taken
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email: data.email },
          { users_id: data.schoolId }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === data.email) {
        return { success: false, error: 'An account with this email already exists' }
      }
      if (existingUser.users_id === data.schoolId) {
        return { success: false, error: 'This School ID is already taken' }
      }
    }

    // Verify personnel type exists if provided
    if (data.personnelTypeId) {
      const personnelType = await prisma.personnel_types.findUnique({
        where: { personnel_types_id: data.personnelTypeId }
      })

      if (!personnelType || !personnelType.isActive) {
        return { success: false, error: 'Selected personnel type is not available' }
      }
    }

    // Create user account
    await prisma.users.create({
      data: {
        users_id: data.schoolId, // Use school ID as the primary key
        email: data.email,
        name: data.name,
        password: '', // No password needed for OAuth users
        role: users_role.PERSONNEL,
        personnel_types_id: data.personnelTypeId || null,
        isActive: true,
        updatedAt: new Date()
      }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error creating user account:', error)
    return { success: false, error: 'Failed to create account. Please try again.' }
  }
}

