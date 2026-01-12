const { localPrisma: prisma } = require('./lib/prisma');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
    try {
        const config = await prisma.systemConfig.findFirst();
        if (config) {
            await prisma.systemConfig.update({
                where: { id: config.id },
                data: {
                    localDbUrl: "file:./prisma/dev.db"
                }
            });
            console.log('Successfully updated localDbUrl to file:./prisma/dev.db');
        }
    } catch (err) {
        console.error('Error updating config:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
