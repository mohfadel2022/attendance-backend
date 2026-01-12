const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error('Por favor, indica un email: node demoteUser.js user@example.com');
        process.exit(1);
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        });
        console.log(`✅ Usuario ${user.email} degradado exitosamente a ADMIN (ya no tiene acceso a BD).`);
    } catch (error) {
        console.error('❌ Error: El usuario no existe o hubo un problema con la base de datos.');
    } finally {
        await prisma.$disconnect();
    }
}

main();
