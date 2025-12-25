const { Client } = require('pg');
require('dotenv').config();

const dbName = 'fichaje_db';
const connectionString = process.env.DATABASE_URL; // e.g. postgres://postgres:postgres@localhost:5432/fichaje_db

// Helper to get connection string for 'postgres' db
function getMaintenanceConnectionString(url) {
    try {
        const u = new URL(url);
        u.pathname = '/postgres';
        return u.toString();
    } catch (e) {
        return url;
    }
}

(async () => {
    console.log(`Checking database: ${dbName}...`);

    // 1. Try connecting to target DB
    const clientTarget = new Client({ connectionString });
    try {
        await clientTarget.connect();
        console.log(`Successfully connected to ${dbName}.`);
        await clientTarget.end();
        process.exit(0);
    } catch (err) {
        console.log(`Could not connect to ${dbName} directly: ${err.message}`);
        await clientTarget.end();

        // 2. Try connecting to 'postgres' to create it
        if (err.message.includes('does not exist')) {
            console.log(`Attempting to create database ${dbName}...`);
            const maintenanceUrl = getMaintenanceConnectionString(connectionString);
            const clientMaint = new Client({ connectionString: maintenanceUrl });

            try {
                await clientMaint.connect();
                await clientMaint.query(`CREATE DATABASE "${dbName}";`);
                console.log(`Database ${dbName} created successfully.`);
                await clientMaint.end();
                process.exit(0);
            } catch (createErr) {
                console.error(`Failed to create database: ${createErr.message}`);
                await clientMaint.end();
                process.exit(1);
            }
        } else {
            console.error('Connection failed due to other reason (e.g. auth/port).');
            process.exit(1);
        }
    }
})();
