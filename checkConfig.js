const { PrismaClient } = require('@prisma/client-pg');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_jiRMr0wLQkA7@ep-calm-meadow-ahpmz114-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        }
    }
});

async function main() {
    try {
        const config = await prisma.systemConfig.findFirst();
        console.log('Current SystemConfig:', JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Error fetching config:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
