const { localPrisma: prisma } = require('./lib/prisma');
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function verify() {
    console.log('--- Verification of Pull From Remote ---');
    try {
        const config = await prisma.systemConfig.findFirst();
        if (!config || !config.remoteDbUrl) {
            console.error('Remote DB URL not configured in SystemConfig');
            return;
        }

        console.log('Remote URL:', config.remoteDbUrl);
        const remoteClient = new Client({ connectionString: config.remoteDbUrl });
        await remoteClient.connect();
        console.log('Successfully connected to Remote DB.');

        // 1. Pull Users
        const resRemoteUsers = await remoteClient.query('SELECT * FROM "User"');
        const remoteUsers = resRemoteUsers.rows;
        console.log(`Found ${remoteUsers.length} users on remote.`);

        let userUpdates = 0;
        let userCreates = 0;

        for (const rUser of remoteUsers) {
            const existing = await prisma.user.findUnique({ where: { email: rUser.email } });
            await prisma.user.upsert({
                where: { email: rUser.email },
                update: {
                    name: rUser.name,
                    password: rUser.password,
                    role: rUser.role,
                    code: rUser.code,
                    theme: rUser.theme,
                    language: rUser.language
                },
                create: {
                    name: rUser.name,
                    email: rUser.email,
                    password: rUser.password,
                    role: rUser.role,
                    code: rUser.code,
                    theme: rUser.theme,
                    language: rUser.language,
                    createdAt: rUser.createdAt
                }
            });
            if (existing) userUpdates++; else userCreates++;
        }
        console.log(`Users processed: ${userUpdates} updated, ${userCreates} created.`);

        // 2. Pull Attendance
        const resRemoteAttendance = await remoteClient.query('SELECT * FROM "Attendance"');
        const remoteAttendance = resRemoteAttendance.rows;
        console.log(`Found ${remoteAttendance.length} attendance records on remote.`);

        const localUsers = await prisma.user.findMany();
        let attCreated = 0;
        let attSkipped = 0;

        for (const rAt of remoteAttendance) {
            const rUser = remoteUsers.find(u => u.id === rAt.userId);
            if (!rUser) continue;
            const lUser = localUsers.find(u => u.email === rUser.email);
            if (!lUser) continue;

            const existing = await prisma.attendance.findFirst({
                where: {
                    userId: lUser.id,
                    timestamp: rAt.timestamp,
                    type: rAt.type
                }
            });

            if (!existing) {
                await prisma.attendance.create({
                    data: {
                        userId: lUser.id,
                        type: rAt.type,
                        timestamp: rAt.timestamp,
                        status: rAt.status,
                        latitude: rAt.latitude,
                        longitude: rAt.longitude,
                        isVerified: rAt.isVerified
                    }
                });
                attCreated++;
            } else {
                attSkipped++;
            }
        }
        console.log(`Attendance processed: ${attCreated} created, ${attSkipped} skipped (already exists).`);

        // 3. Pull Office
        const resRemoteOffice = await remoteClient.query('SELECT * FROM "Office"');
        const remoteOffices = resRemoteOffice.rows;
        console.log(`Found ${remoteOffices.length} office records on remote.`);

        for (const rOff of remoteOffices) {
            await prisma.office.upsert({
                where: { id: rOff.id },
                update: {
                    name: rOff.name,
                    latitude: rOff.latitude,
                    longitude: rOff.longitude,
                    radius: rOff.radius,
                    updatedAt: rOff.updatedAt
                },
                create: {
                    id: rOff.id,
                    name: rOff.name,
                    latitude: rOff.latitude,
                    longitude: rOff.longitude,
                    radius: rOff.radius,
                    updatedAt: rOff.updatedAt
                }
            });
        }
        console.log('Office records synced.');

        await remoteClient.end();
        console.log('Verification finished successfully.');

    } catch (err) {
        console.error('Verification failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
