const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const archiveDir = path.join(
  process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data'),
  'uploads',
  'archive'
);
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, archiveDir),
  filename: (req, file, cb) => cb(null, `design_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// GET /api/archive ?customer_id=&search=
router.get('/', requireAuth, (req, res) => {
  const { customer_id, search } = req.query;
  let sql = `
    SELECT a.*, c.name AS customer_name FROM archive_designs a
    LEFT JOIN customers c ON c.id = a.customer_id WHERE 1=1
  `;
  const params = [];
  if (customer_id) {
    sql += ' AND a.customer_id = ?';
    params.push(customer_id);
  }
  if (search) {
    sql += ' AND (a.name LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY a.created_at DESC';
  res.json({ designs: db.prepare(sql).all(...params) });
});

// POST /api/archive (multipart: file, customer_id, order_id, name)
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم إرفاق ملف' });
  const { customer_id, order_id, name } = req.body;
  const relPath = path.join('uploads', 'archive', req.file.filename);
  const info = db
    .prepare(
      'INSERT INTO archive_designs (customer_id, order_id, name, file_path) VALUES (?, ?, ?, ?)'
    )
    .run(customer_id || null, order_id || null, name || req.file.originalname, relPath);
  res.json({ id: info.lastInsertRowid, file_path: relPath });
});

// DELETE /api/archive/:id
router.delete('/:id', requireAuth, (req, res) => {
  const design = db.prepare('SELECT * FROM archive_designs WHERE id = ?').get(req.params.id);
  if (!design) return res.status(404).json({ error: 'غير موجود' });
  const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data');
  const filePath = path.join(dataDir, design.file_path);
  db.prepare('DELETE FROM archive_designs WHERE id = ?').run(req.params.id);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {
    /* ignore */
  }
  res.json({ ok: true });
});

module.exports = router;
