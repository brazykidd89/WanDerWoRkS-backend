// routes/listings.js
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  const base = `
    SELECT listings.*, lots.metal_type, lots.weight_lbs, lots.condition
    FROM listings JOIN lots ON lots.id = listings.lot_id
  `;
  const rows = status
    ? db.prepare(`${base} WHERE listings.status = ? ORDER BY listings.created_at DESC`).all(status)
    : db.prepare(`${base} ORDER BY listings.created_at DESC`).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const listing = db.prepare(`
    SELECT listings.*, lots.metal_type, lots.weight_lbs, lots.condition
    FROM listings JOIN lots ON lots.id = listings.lot_id
    WHERE listings.id = ?
  `).get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

router.post('/', (req, res) => {
  const { lot_id, asking_price, description } = req.body;
  if (!lot_id) return res.status(400).json({ error: 'lot_id is required' });

  const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot_id);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });
  if (lot.status !== 'available') {
    return res.status(409).json({ error: `Lot is not available (status: ${lot.status})` });
  }

  const insertListing = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO listings (lot_id, asking_price, description) VALUES (?, ?, ?)
    `).run(lot_id, asking_price || null, description || null);

    db.prepare(`UPDATE lots SET status = 'listed', updated_at = datetime('now') WHERE id = ?`).run(lot_id);

    return result.lastInsertRowid;
  });

  const id = insertListing();
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
  res.status(201).json(listing);
});

router.post('/:id/claim', (req, res) => {
  const { buyer_name, buyer_contact, final_price } = req.body;
  if (!buyer_name) return res.status(400).json({ error: 'buyer_name is required' });

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.status !== 'open') {
    return res.status(409).json({ error: `Listing is not open (status: ${listing.status})` });
  }

  const claim = db.transaction(() => {
    const txResult = db.prepare(`
      INSERT INTO transactions (listing_id, buyer_name, buyer_contact, final_price, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(listing.id, buyer_name, buyer_contact || null, final_price ?? listing.asking_price ?? null);

    db.prepare(`UPDATE listings SET status = 'claimed', updated_at = datetime('now') WHERE id = ?`).run(listing.id);
    db.prepare(`UPDATE lots SET status = 'claimed', updated_at = datetime('now') WHERE id = ?`).run(listing.lot_id);

    return txResult.lastInsertRowid;
  });

  const txId = claim();
  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
  res.status(201).json(transaction);
});

router.delete('/:id', (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const cancel = db.transaction(() => {
    db.prepare(`UPDATE listings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(listing.id);
    db.prepare(`UPDATE lots SET status = 'available', updated_at = datetime('now') WHERE id = ?`).run(listing.lot_id);
  });
  cancel();
  res.status(204).send();
});

module.exports = router;
