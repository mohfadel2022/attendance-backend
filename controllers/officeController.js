const prisma = require('../lib/prisma');

exports.getOffice = async (req, res) => {
    try {
        let office = await prisma.office.findFirst();
        if (!office) {
            // Create a default office if none exists
            office = await prisma.office.create({
                data: {
                    name: 'Main Office',
                    latitude: 0,
                    longitude: 0,
                    radius: 500
                }
            });
        }
        res.json(office);
    } catch (error) {
        console.error('getOffice error:', error);
        res.status(500).json({ error: 'Failed to get office settings' });
    }
};

exports.updateOffice = async (req, res) => {
    try {
        const { latitude, longitude, radius, name } = req.body;
        let office = await prisma.office.findFirst();

        if (office) {
            office = await prisma.office.update({
                where: { id: office.id },
                data: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    radius: parseFloat(radius),
                    name: name || office.name
                }
            });
        } else {
            office = await prisma.office.create({
                data: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    radius: parseFloat(radius),
                    name: name || 'Main Office'
                }
            });
        }
        res.json(office);
    } catch (error) {
        console.error('updateOffice error:', error);
        res.status(500).json({ error: 'Failed to update office settings' });
    }
};
