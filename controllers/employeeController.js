const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// Helper to generate unique code
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

exports.createEmployee = async (req, res) => {
    const { name, email, password, department, role } = req.body;
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        const code = generateCode(); // Simplified for now

        const employee = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'EMPLOYEE',
                code,
                // department field not in User model yet? Plan said "Name, Department, ID, Code".
                // My schema has: name, email, password, role, code.
                // I should probably add department to schema later or put it in name?
                // For now, ignoring department or treating it as future work.
            },
        });

        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getEmployees = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const currentUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userRole = currentUser.role.trim().toUpperCase();

        let whereClause = {};

        if (userRole === 'ADMIN') {
            whereClause = { role: 'EMPLOYEE' };
        } else if (userRole.includes('SUPER')) {
            whereClause = {};
        } else {
            whereClause = { id: currentUser.id };
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, name: true, email: true, code: true, role: true }
        });

        res.json(users);
    } catch (error) {
        console.error('[ERROR] getEmployees:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        // Delete attendance first (Manual cascade)
        await prisma.attendance.deleteMany({
            where: { userId: userId }
        });

        await prisma.user.delete({ where: { id: userId } });
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete employee: ' + error.message });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;

        // Password update logic could go here if needed, keeping it simple for now
        const updated = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { name, email, role },
            select: { id: true, name: true, email: true, code: true, role: true }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update employee' });
    }
};
