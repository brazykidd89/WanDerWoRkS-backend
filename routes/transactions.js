// routes/transactions.js
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  const base = `
    SELECT transactions.*, listings.lot_id, listings.asking_price
    FROM transactions JOIN listings ON listings.id = transactions.listing_id
  `;
  const rows = status
    ? db.prepare(`${base} WHERE transactions.status = ? ORDER BY transactions.created_at DESC`).all(status)
    : db.prepare(`${base} ORDER BY transactions.created_at DESC`).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

router.put('/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  const { status, final_price } = req.body;
  const validStatuses = ['pending', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${validStatuses.join(', ')}` });
  }

  db.prepare(`
    UPDATE transactions
    SET status = COALESCE(@status, status),
        final_price = COALESCE(@final_price, final_price),
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ status: status || null, final_price: final_price ?? null, id: req.params.id });

  if (status === 'cancelled') {
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(tx.listing_id);
    db.prepare(`UPDATE listings SET status = 'open', updated_at = datetime('now') WHERE id = ?`).run(listing.id);
    db.prepare(`UPDATE lots SET status = 'available', updated_at = datetime('now') WHERE id = ?`).run(listing.lot_id);
  }

  const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
