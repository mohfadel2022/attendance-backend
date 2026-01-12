const { localPrisma, refreshClient, createClient } = require('../lib/prisma');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

exports.getConfig = async (req, res) => {
    try {
        let config = await localPrisma.systemConfig.findFirst();
        if (!config) {
            config = await localPrisma.systemConfig.create({
                data: {
                    dbMode: 'local',
                    syncActive: false
                }
            });
        }
        res.json(config);
    } catch (error) {
        console.error('getConfig error:', error);
        res.status(500).json({ error: 'Failed to get config' });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const { dbMode, localDbUrl, remoteDbUrl, syncActive } = req.body;
        let config = await localPrisma.systemConfig.findFirst();

        if (config) {
            config = await localPrisma.systemConfig.update({
                where: { id: config.id },
                data: { dbMode, localDbUrl, remoteDbUrl, syncActive }
            });
        } else {
            config = await localPrisma.systemConfig.create({
                data: { dbMode, localDbUrl, remoteDbUrl, syncActive }
            });
        }

        await refreshClient();
        res.json(config);
    } catch (error) {
        console.error('updateConfig error:', error);
        res.status(500).json({ error: 'Failed to update config' });
    }
};

// Helper to check connection
const checkConnection = async (url) => {
    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
        const client = new Client({ connectionString: url });
        try {
            await client.connect();
            await client.end();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    } else if (url.startsWith('file:')) {
        try {
            const filePath = path.join(__dirname, '..', url.replace('file:', ''));
            if (fs.existsSync(filePath)) return { ok: true };
            return { ok: false, error: 'Database file not found: ' + filePath };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }
    return { ok: false, error: 'Unsupported protocol' };
};

exports.checkLocalStatus = async (req, res) => {
    const { url } = req.body;
    const finalUrl = url || process.env.DATABASE_URL;
    const result = await checkConnection(finalUrl);
    if (result.ok) {
        res.json({ status: 'connected', message: 'Connection successful' });
    } else {
        res.status(500).json({ status: 'error', message: result.error });
    }
};

exports.checkRemoteStatus = async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ status: 'error', message: 'No URL provided' });
    const result = await checkConnection(url);
    if (result.ok) {
        res.json({ status: 'connected', message: 'Connection successful' });
    } else {
        res.status(500).json({ status: 'error', message: result.error });
    }
};

exports.exploreLocalFiles = async (req, res) => {
    try {
        const prismaDir = path.join(__dirname, '..', 'prisma');
        if (!fs.existsSync(prismaDir)) return res.json([]);
        const files = fs.readdirSync(prismaDir);
        const dbFiles = files.filter(f => f.endsWith('.db') || f.endsWith('.sqlite'));
        res.json(dbFiles.map(f => ({ name: f, url: `file:./prisma/${f}` })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to explore files' });
    }
};

exports.syncDatabases = async (req, res) => {
    // PUSH: Local -> Remote (Regardless of current dbMode)
    let stage = 'Iniciando';
    try {
        const config = await localPrisma.systemConfig.findFirst();
        if (!config || !config.localDbUrl || !config.remoteDbUrl) {
            return res.status(400).json({ error: 'Configuración incompleta: Faltan URLs de base de datos.' });
        }

        stage = 'Verificando conexiones';
        const localCheck = await checkConnection(config.localDbUrl);
        const remoteCheck = await checkConnection(config.remoteDbUrl);
        if (!localCheck.ok) return res.status(500).json({ error: `Error en conexión Local: ${localCheck.error}` });
        if (!remoteCheck.ok) return res.status(500).json({ error: `Error en conexión Remota: ${remoteCheck.error}` });

        stage = 'Conectando motores';
        const localSource = createClient(config.localDbUrl);
        const remoteTarget = new Client({ connectionString: config.remoteDbUrl });
        await remoteTarget.connect();

        // 3. Sync Logic
        stage = 'Sincronizando Usuarios';
        const localUsers = await localSource.user.findMany();
        let userCount = 0;
        for (const user of localUsers) {
            const resRemote = await remoteTarget.query('SELECT id FROM "User" WHERE email = $1', [user.email]);
            if (resRemote.rows.length === 0) {
                await remoteTarget.query(
                    'INSERT INTO "User" (name, email, password, role, code, "createdAt", theme, language) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [user.name, user.email, user.password, user.role, user.code, user.createdAt, user.theme, user.language]
                );
            } else {
                await remoteTarget.query(
                    'UPDATE "User" SET name=$1, password=$2, role=$3, code=$4, theme=$5, language=$6 WHERE email=$7',
                    [user.name, user.password, user.role, user.code, user.theme, user.language, user.email]
                );
            }
            userCount++;
        }

        stage = 'Sincronizando Asistencia';
        const localAttendance = await localSource.attendance.findMany({ include: { user: true } });
        let attendanceCount = 0;
        for (const record of localAttendance) {
            const resRemote = await remoteTarget.query(
                'SELECT id FROM "Attendance" WHERE "userId" = (SELECT id FROM "User" WHERE email = $1) AND timestamp = $2 AND type = $3',
                [record.user.email, record.timestamp, record.type]
            );

            if (resRemote.rows.length === 0) {
                const uRes = await remoteTarget.query('SELECT id FROM "User" WHERE email = $1', [record.user.email]);
                if (uRes.rows[0]) {
                    const remoteUserId = uRes.rows[0].id;
                    await remoteTarget.query(
                        'INSERT INTO "Attendance" ("userId", type, timestamp, status, latitude, longitude, "isVerified") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                        [remoteUserId, record.type, record.timestamp, record.status, record.latitude, record.longitude, record.isVerified]
                    );
                    attendanceCount++;
                }
            }
        }

        stage = 'Sincronizando Oficinas';
        const localOffices = await localSource.office.findMany();
        let officeCount = 0;
        for (const office of localOffices) {
            const resRemote = await remoteTarget.query('SELECT id FROM "Office" WHERE name = $1', [office.name]);
            if (resRemote.rows.length === 0) {
                await remoteTarget.query(
                    'INSERT INTO "Office" (name, latitude, longitude, radius, "updatedAt") VALUES ($1, $2, $3, $4, $5)',
                    [office.name, office.latitude, office.longitude, office.radius, office.updatedAt]
                );
            } else {
                await remoteTarget.query(
                    'UPDATE "Office" SET latitude=$1, longitude=$2, radius=$3, "updatedAt"=$4 WHERE name=$5',
                    [office.latitude, office.longitude, office.radius, office.updatedAt, office.name]
                );
            }
            officeCount++;
        }

        stage = 'Finalizando';
        await remoteTarget.end();
        await localSource.$disconnect();
        await localPrisma.systemConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date() } });

        res.json({
            success: true,
            message: `Sincronización (Push) exitosa. Procesados: ${userCount} usuarios, ${attendanceCount} nuevos registros de asistencia, ${officeCount} oficinas.`
        });
    } catch (error) {
        console.error(`Error en SyncDatabases (${stage}):`, error);
        res.status(500).json({
            error: `Fallo en etapa [${stage}]: ${error.message}`
        });
    }
};

exports.pullFromRemote = async (req, res) => {
    // PULL: Remote -> Local (Regardless of current dbMode)
    let stage = 'Iniciando';
    try {
        const config = await localPrisma.systemConfig.findFirst();
        if (!config || !config.localDbUrl || !config.remoteDbUrl) {
            return res.status(400).json({ error: 'Configuración incompleta: Faltan URLs de base de datos.' });
        }

        stage = 'Verificando conexiones';
        const localCheck = await checkConnection(config.localDbUrl);
        const remoteCheck = await checkConnection(config.remoteDbUrl);
        if (!localCheck.ok) return res.status(500).json({ error: `Error en conexión Local: ${localCheck.error}` });
        if (!remoteCheck.ok) return res.status(500).json({ error: `Error en conexión Remota: ${remoteCheck.error}` });

        stage = 'Conectando motores';
        const localTarget = createClient(config.localDbUrl);
        const remoteSource = new Client({ connectionString: config.remoteDbUrl });
        await remoteSource.connect();

        // 3. Pull Logic
        stage = 'Trayendo Usuarios';
        const resRemoteUsers = await remoteSource.query('SELECT * FROM "User"');
        const remoteUsers = resRemoteUsers.rows;
        let userCount = 0;
        for (const rUser of remoteUsers) {
            await localTarget.user.upsert({
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
            userCount++;
        }

        stage = 'Trayendo Asistencia';
        const resRemoteAttendance = await remoteSource.query('SELECT * FROM "Attendance"');
        const remoteAttendance = resRemoteAttendance.rows;
        const localUsers = await localTarget.user.findMany();
        let attCount = 0;
        for (const rAt of remoteAttendance) {
            const rUser = remoteUsers.find(u => u.id === rAt.userId);
            if (!rUser) continue;
            const lUser = localUsers.find(u => u.email === rUser.email);
            if (!lUser) continue;

            const existing = await localTarget.attendance.findFirst({
                where: { userId: lUser.id, timestamp: rAt.timestamp, type: rAt.type }
            });

            if (!existing) {
                await localTarget.attendance.create({
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
                attCount++;
            }
        }

        stage = 'Trayendo Oficinas';
        const resRemoteOffice = await remoteSource.query('SELECT * FROM "Office"');
        const remoteOffices = resRemoteOffice.rows;
        let officeCount = 0;
        for (const rOff of remoteOffices) {
            await localTarget.office.upsert({
                where: { name: rOff.name },
                update: {
                    latitude: rOff.latitude,
                    longitude: rOff.longitude,
                    radius: rOff.radius,
                    updatedAt: rOff.updatedAt
                },
                create: {
                    name: rOff.name,
                    latitude: rOff.latitude,
                    longitude: rOff.longitude,
                    radius: rOff.radius,
                    updatedAt: rOff.updatedAt
                }
            });
            officeCount++;
        }

        stage = 'Finalizando';
        await remoteSource.end();
        await localTarget.$disconnect();
        await localPrisma.systemConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date() } });

        res.json({
            success: true,
            message: `Datos traídos (Pull) con éxito. Procesados: ${userCount} usuarios, ${attCount} nuevos registros de asistencia, ${officeCount} oficinas.`
        });
    } catch (error) {
        console.error(`Error en PullFromRemote (${stage}):`, error);
        res.status(500).json({
            error: `Fallo en etapa [${stage}]: ${error.message}`
        });
    }
};
