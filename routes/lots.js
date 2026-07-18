// routes/lots.js
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM lots WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM lots ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });
  res.json(lot);
});

router.post('/', (req, res) => {
  const { metal_type, weight_lbs, condition, source_name, source_location, notes } = req.body;

  if (!metal_type || weight_lbs == null) {
    return res.status(400).json({ error: 'metal_type and weight_lbs are required' });
  }

  const stmt = db.prepare(`
    INSERT INTO lots (metal_type, weight_lbs, condition, source_name, source_location, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(metal_type, weight_lbs, condition || null, source_name || null, source_location || null, notes || null);
  const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(lot);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lot not found' });

  const fields = ['metal_type', 'weight_lbs', 'condition', 'source_name', 'source_location', 'status', 'notes'];
  const updates = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const setClause = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE lots SET ${setClause}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...updates, id: req.params.id });
  }

  const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
  res.json(lot);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM lots WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Lot not found' });
  res.status(204).send();
});

module.exports = router;
