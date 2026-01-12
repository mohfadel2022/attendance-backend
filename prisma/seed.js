const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    try {
        // Create Superadmin User
        const superHashedPassword = await bcrypt.hash('super123', 10);
        const superadmin = await prisma.user.upsert({
            where: { email: 'super@test.com' },
            update: {},
            create: {
                name: 'Super Developer',
                email: 'super@test.com',
                password: superHashedPassword,
                role: 'SUPERADMIN',
                code: 'DEV001'
            },
        });

        // Create Admin User
        const hashedPassword = await bcrypt.hash('admin123', 10);

        const admin = await prisma.user.upsert({
            where: { email: 'admin@test.com' },
            update: {},
            create: {
                name: 'Admin User',
                email: 'admin@test.com',
                password: hashedPassword,
                role: 'ADMIN',
                code: 'ADMIN001'
            },
        });

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

        console.log('✅ Seed data created successfully!');
        console.log('\nSuperadmin Credentials:');
        console.log('Email: super@test.com');
        console.log('Password: super123');
        console.log('\nAdmin Credentials:');
        console.log('Email: admin@test.com');
        console.log('Password: admin123');
        console.log('\nEmployee Credentials:');
        console.log('Email: employee@test.com');
        console.log('Password: employee123');
    } catch (error) {
        console.error('Error seeding database:', error);
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
