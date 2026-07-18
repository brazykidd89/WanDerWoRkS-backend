// routes/projects.js
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const lots = db.prepare(`
    SELECT lots.*, project_lots.assigned_at
    FROM project_lots
    JOIN lots ON lots.id = project_lots.lot_id
    WHERE project_lots.project_id = ?
  `).all(req.params.id);

  res.json({ ...project, lots });
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(`INSERT INTO projects (name, description) VALUES (?, ?)`).run(name, description || null);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const fields = ['name', 'description', 'status'];
  const updates = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  const setClause = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE projects SET ${setClause}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...updates, id: req.params.id });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

router.post('/:id/lots', (req, res) => {
  const { lot_id } = req.body;
  if (!lot_id) return res.status(400).json({ error: 'lot_id is required' });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot_id);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });

  const assign = db.transaction(() => {
    db.prepare(`INSERT INTO project_lots (project_id, lot_id) VALUES (?, ?)`).run(req.params.id, lot_id);
    db.prepare(`UPDATE lots SET status = 'used', updated_at = datetime('now') WHERE id = ?`).run(lot_id);
  });

  try {
    assign();
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Lot is already assigned to this project' });
    }
    throw err;
  }

  res.status(201).json({ project_id: Number(req.params.id), lot_id });
});

router.delete('/:id/lots/:lotId', (req, res) => {
  const result = db.prepare(`
    DELETE FROM project_lots WHERE project_id = ? AND lot_id = ?
  `).run(req.params.id, req.params.lotId);

  if (result.changes === 0) return res.status(404).json({ error: 'Assignment not found' });

  db.prepare(`UPDATE lots SET status = 'available', updated_at = datetime('now') WHERE id = ?`).run(req.params.lotId);
  res.status(204).send();
});

module.exports = router;
