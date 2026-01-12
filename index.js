const express = require('express');
const cors = require('cors');
require('dotenv').config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

process.on('exit', (code) => {
  console.log(`Process is exiting with code: ${code}`);
});

const app = express();
const PORT = process.env.PORT || 3001;
const cookieParser = require('cookie-parser');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/employees', require('./routes/employeeRoute'));
app.use('/api/attendance', require('./routes/attendanceRoute'));
app.use('/api/office', require('./routes/officeRoute'));
app.use('/api/config', require('./routes/configRoute'));

app.get('/', (req, res) => {
  res.send('Attendance System API is running');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error('❌ Server failed to start:', err);
  }
  process.exit(1);
});

// To prevent premature exit in some environments, keep the event loop active
setInterval(() => { }, 1000 * 60 * 60); // 1 hour dummy interval
