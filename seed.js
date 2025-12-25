const prisma = require('./lib/prisma');
const bcrypt = require('bcryptjs'); // Need to install bcryptjs!

async function main() {
    // Check if admin exists
    const adminEmail = 'admin@example.com';
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existing) {
        const password = await bcrypt.hash('admin123', 10);
        const user = await prisma.user.create({
            data: {
                name: 'Admin User',
                email: adminEmail,
                password: password,
                role: 'ADMIN',
                code: 'ADMIN-001', // Unique code
            },
        });
        console.log('Admin user created:', user);
    } else {
        console.log('Admin user already exists.');
    }

    // Check if test employee exists
    const employeeEmail = 'employee@example.com';
    const existingEmp = await prisma.user.findUnique({ where: { email: employeeEmail } });

    if (!existingEmp) {
        const password = await bcrypt.hash('employee123', 10);
        const user = await prisma.user.create({
            data: {
                name: 'Test Employee',
                email: employeeEmail,
                password: password,
                role: 'EMPLOYEE',
                code: 'EMP-001',
            },
        });
        console.log('Test employee created:', user);
    } else {
        console.log('Test employee already exists.');
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
