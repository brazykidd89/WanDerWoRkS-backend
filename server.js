// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const lotsRouter = require('./routes/lots');
const listingsRouter = require('./routes/listings');
const transactionsRouter = require('./routes/transactions');
const projectsRouter = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'Wanderworks API',
    status: 'ok',
    endpoints: [
      'GET/POST /api/lots',
      'GET/PUT/DELETE /api/lots/:id',
      'GET/POST /api/listings',
      'GET/DELETE /api/listings/:id',
      'POST /api/listings/:id/claim',
      'GET/PUT /api/transactions',
      'GET/PUT /api/transactions/:id',
      'GET/POST /api/projects',
      'GET/PUT /api/projects/:id',
      'POST /api/projects/:id/lots',
      'DELETE /api/projects/:id/lots/:lotId',
    ],
  });
});

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.use('/api/lots', lotsRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/projects', projectsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Wanderworks API running on port ${PORT}`);
});
