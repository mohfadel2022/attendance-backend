const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    try {
        // Create Sample Employee
        const employeePassword = await bcrypt.hash('employee123', 10);

        const employee = await prisma.user.upsert({
            where: { email: 'employee@test.com' },
            update: {},
            create: {
                name: 'John Doe',
                email: 'employee@test.com',
                password: employeePassword,
                role: 'EMPLOYEE',
                code: 'EMP001'
            },
        });

        console.log('✅ Employee created successfully!');
        console.log('\nEmployee Credentials:');
        console.log('Email: employee@test.com');
        console.log('Password: employee123');
        console.log('Code: EMP001');
    } catch (error) {
        console.error('Error creating employee:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
