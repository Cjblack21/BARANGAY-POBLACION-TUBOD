const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeAttendanceDeduction() {
    try {
        console.log('🔍 Searching for "Attendance" deduction type...');

        // Find the attendance deduction type
        const attendanceDeduction = await prisma.deduction_types.findFirst({
            where: {
                name: {
                    contains: 'Attendance'
                }
            }
        });

        if (!attendanceDeduction) {
            console.log('❌ No "Attendance" deduction type found.');
            return;
        }

        console.log('✅ Found deduction:', attendanceDeduction.name);
        console.log('   ID:', attendanceDeduction.deduction_types_id);
        console.log('   Description:', attendanceDeduction.description);

        // Check if there are any deductions using this type
        const relatedDeductions = await prisma.deductions.count({
            where: {
                deduction_types_id: attendanceDeduction.deduction_types_id
            }
        });

        console.log(`   Related deductions: ${relatedDeductions}`);

        if (relatedDeductions > 0) {
            console.log('⚠️  WARNING: This deduction type has related deductions.');
            console.log('   Deleting the deduction type will also delete all related deductions.');

            // Delete related deductions first
            const deletedDeductions = await prisma.deductions.deleteMany({
                where: {
                    deduction_types_id: attendanceDeduction.deduction_types_id
                }
            });
            console.log(`✅ Deleted ${deletedDeductions.count} related deductions.`);
        }

        // Delete the deduction type
        await prisma.deduction_types.delete({
            where: {
                deduction_types_id: attendanceDeduction.deduction_types_id
            }
        });

        console.log('✅ Successfully deleted "Attendance" deduction type!');

    } catch (error) {
        console.error('❌ Error removing attendance deduction:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

removeAttendanceDeduction()
    .then(() => {
        console.log('✅ Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
