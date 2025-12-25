const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/employees', require('./routes/employeeRoute'));
app.use('/api/attendance', require('./routes/attendanceRoute'));

app.get('/', (req, res) => {
  res.send('Attendance System API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
