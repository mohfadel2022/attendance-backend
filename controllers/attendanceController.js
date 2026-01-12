const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '../debug.log');

const logToFile = (msg) => {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
};

const getDistance = (lat1, lon1, lat2, lon2) => {
    
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
};

// Check In
exports.checkIn = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { qrCode, latitude, longitude } = req.body;

        const rawQr = qrCode || "";
        const trimmedQr = rawQr.trim();

        if (trimmedQr !== 'OFFICE_CHECK_2025') {
            return res.status(400).json({ error: 'Invalid QR Code' });
        }

        // Location Verification
        let isVerified = false;
        const office = await prisma.office.findFirst();
        if (office && latitude && longitude) {
            
            const distance = getDistance(latitude, longitude, office.latitude, office.longitude);
            if (distance <= office.radius) {
                isVerified = true;
            } else {

                console.warn(`[Check-in] User ${userId} too far: ${distance.toFixed(1)}m > ${office.radius}m`);
                return res.status(403).json({
                    error: 'You are outside the office zone',
                    distance: Math.round(distance),
                    allowedRadius: office.radius
                });
            }
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId: userId,
                type: 'CHECK_IN',
                status: 'ON_TIME',
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                isVerified: isVerified
            }
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Failed to check in' });
    }
};

// Check Out
exports.checkOut = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { qrCode, latitude, longitude } = req.body;

        const rawQr = qrCode || "";
        const trimmedQr = rawQr.trim();

        if (trimmedQr !== 'OFFICE_CHECK_2025') {
            return res.status(400).json({ error: 'Invalid QR Code' });
        }

        // Location Verification
        let isVerified = false;
        const office = await prisma.office.findFirst();
        if (office && latitude && longitude) {
            const distance = getDistance(latitude, longitude, office.latitude, office.longitude);
            if (distance <= office.radius) {
                isVerified = true;
            } else {
                return res.status(403).json({
                    error: 'You are outside the office zone',
                    distance: Math.round(distance),
                    allowedRadius: office.radius
                });
            }
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId: userId,
                type: 'CHECK_OUT',
                status: 'Left Work',
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                isVerified: isVerified
            }
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ error: 'Failed to check out' });
    }
};

// Get Status (Last attendance record)
exports.getStatus = async (req, res) => {
    try {
        const userId = req.user.userId;

        const lastRecord = await prisma.attendance.findFirst({
            where: { userId: userId },
            orderBy: { timestamp: 'desc' }
        });

        if (!lastRecord) {
            return res.json({ status: 'No record', type: null });
        }

        return res.json(lastRecord);
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
};

// Get ALL Attendance (Admin)
exports.getAll = async (req, res) => {
    try {

        const records = await prisma.attendance.findMany({
            include: {
                user: {
                    select: { name: true, email: true, code: true }
                }
            },
            orderBy: { timestamp: 'desc' }
        });

        return res.json(records);
    } catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({ error: 'Failed to get records' });
    }
};

// Delete Record
exports.deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.attendance.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Record deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete record' });
    }
};

// Update Record
exports.updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, timestamp, status } = req.body;

        const updated = await prisma.attendance.update({
            where: { id: parseInt(id) },
            data: { type, timestamp, status }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: 'Failed to update record' });
    }
};
