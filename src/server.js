const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');

dotenv.config();

// Connect to database
 connectDB();

// // Initialize Firebase
 initializeFirebase();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/head', require('./routes/head'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

//Routes
app.use('/api/admin', require('./routes/adminDepartments'));



app.use('/api/admin/analytics', require('./routes/adminAnalytics'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/departments', require('./routes/departments'));

app.use('/api/admin/departments', require('./routes/departments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Civic Report System API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});