require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'COCO Backend is running' });
});

// Import and mount routes
const authRoutes = require('./routes/auth');
const approvalRoutes = require('./routes/approvals');
const permsRoutes = require('./routes/permissions');

app.use('/api/auth', authRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/permissions', permsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ COCO Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
