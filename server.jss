const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// const Database = require('better-sqlite3'); // Uncomment when you connect your DB

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Base health check route (Crucial for Railway to know the app is alive)
app.get('/', (req, res) => {
  res.send('Wanderworks Backend is running infinitely!');
});

// Use Railway's dynamic PORT variable, falling back to 5000 locally
const PORT = process.env.PORT || 5000;

// Start the server and bind it to the host
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is listening permanently on port ${PORT}`);
});

// --- CRITICAL FOR INFINITE UPTIME: PREVENT CRASHES FROM UNCAUGHT ERRORS ---

// Catches asynchronous errors anywhere in your code instead of letting the app crash
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Do NOT process.exit(). Keep the server alive.
});

// Catches synchronous errors anywhere in your code instead of letting the app crash
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception caught:', error);
  // Do NOT process.exit(). Keep the server alive.
});
