const { PrismaClient: PrismaClientPG } = require('../generated/client-postgresql');
const { PrismaClient: PrismaClientSQLite } = require('../generated/client-sqlite');
const path = require('path');

const createClient = (url) => {
    // Determine which client to use based on protocol
    if (url.startsWith('file:')) {
        let finalUrl = url;
        // Handle path resolution for SQLite
        if (url.startsWith('file:./')) {
            // Prisma SQLite expects paths relative to the schema file or absolute
            // We'll try to keep it as provided but log it
        }
        console.log('Initializing SQLite client for:', finalUrl);
        return new PrismaClientSQLite({
            datasources: {
                db: {
                    url: finalUrl
                }
            }
        });
    } else {
        console.log('Initializing PostgreSQL client for:', url);
        return new PrismaClientPG({
            datasources: {
                db: {
                    url: url
                }
            }
        });
    }
};

// localPrisma is ALWAYS connected to the primary local DATABASE_URL (where SystemConfig lives)
const localPrisma = createClient(process.env.DATABASE_URL);

let currentPrisma = localPrisma; // Default to local
let currentUrl = process.env.DATABASE_URL;

const refreshClient = async () => {
    try {
        const config = await localPrisma.systemConfig.findFirst();
        if (config) {
            const targetUrl = config.dbMode === 'remote' ? config.remoteDbUrl : (config.localDbUrl || process.env.DATABASE_URL);

            if (targetUrl && targetUrl !== currentUrl) {
                console.log(`Switching database client to: ${targetUrl.split('@')[1] || targetUrl}`);
                currentPrisma = createClient(targetUrl);
                currentUrl = targetUrl;
            }
        }
    } catch (err) {
        console.error('Failed to refresh Prisma client:', err.message);
    }
};

// Initial refresh
refreshClient();

// Periodic refresh or export a refresh function
const prismaProxy = new Proxy(localPrisma, {
    get: (target, prop) => {
        if (prop === 'localPrisma') return localPrisma;
        if (prop === 'refreshClient') return refreshClient;
        return currentPrisma[prop];
    }
});

module.exports = prismaProxy;
module.exports.localPrisma = localPrisma; // For explicit access
module.exports.refreshClient = refreshClient;
module.exports.createClient = createClient;
