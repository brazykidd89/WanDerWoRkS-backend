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
    db.prepare(`UPDATE projects SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(Object.values(updates), req.params.id);
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;

