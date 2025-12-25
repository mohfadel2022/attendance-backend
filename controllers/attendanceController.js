const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '../debug.log');

const logToFile = (msg) => {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
};

// Check In
exports.checkIn = async (req, res) => {
    try {
        const userId = req.user.userId; // From auth middleware
        const { qrCode } = req.body;

        const rawQr = qrCode || "";
        const trimmedQr = rawQr.trim();

        logToFile(`[Check-in] User ID: ${userId}, Raw: "${rawQr}", Trimmed: "${trimmedQr}", Expected: "OFFICE_CHECK_2025"`);

        console.log(`[Check-in] User ID: ${userId}`);
        console.log(`- Received QR: "${rawQr}" (length: ${rawQr.length})`);
        console.log(`- Trimmed QR: "${trimmedQr}" (length: ${trimmedQr.length})`);
        console.log(`- Expected: "OFFICE_CHECK_2025" (length: 17)`);

        if (trimmedQr !== 'OFFICE_CHECK_2025') {
            console.warn(`[Check-in] Validation failed for user ${userId}. Received: "${rawQr}"`);
            return res.status(400).json({ error: 'Invalid QR Code' });
        }

        // Check if already checked in today (optional, but good practice)
        // For simplicity, we just create a record.

        const attendance = await prisma.attendance.create({
            data: {
                userId: userId,
                type: 'CHECK_IN',
                status: 'ON_TIME' // Logic for late/on-time could go here
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
        const { qrCode } = req.body;

        const rawQr = qrCode || "";
        const trimmedQr = rawQr.trim();

        logToFile(`[Check-out] User ID: ${userId}, Raw: "${rawQr}", Trimmed: "${trimmedQr}", Expected: "OFFICE_CHECK_2025"`);

        if (trimmedQr !== 'OFFICE_CHECK_2025') {
            logToFile(`[Check-out] Validation failed for user ${userId}`);
            return res.status(400).json({ error: 'Invalid QR Code' });
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId: userId,
                type: 'CHECK_OUT',
                status: 'Left Work'
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
        // In a real app, check if req.user.role === 'ADMIN'

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
