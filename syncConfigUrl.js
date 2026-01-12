const { PrismaClient } = require('@prisma/client-pg');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function main() {
    try {
        const config = await prisma.systemConfig.findFirst();
        if (config) {
            await prisma.systemConfig.update({
                where: { id: config.id },
                data: {
                    localDbUrl: config.remoteDbUrl
                }
            });
            console.log('Successfully updated localDbUrl to match remoteDbUrl.');
        } else {
            console.log('No SystemConfig record found.');
        }
    } catch (err) {
        console.error('Error updating config:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
