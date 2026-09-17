const express = require('express');
const db = require('../db/db');
const { requireAuth, checkPermission } = require('../middleware/auth');
const { listActivity } = require('../services/activityLogService');

const router = express.Router();

// GET /api/activity-logs ?user_id=&action=&model_type=&date_from=&date_to=&page=&pageSize=
router.get('/', requireAuth, checkPermission('view_activity_logs'), (req, res) => {
  const { user_id, action, model_type, date_from, date_to, page, pageSize } = req.query;
  const result = listActivity({
    userId: user_id || undefined,
    action: action || undefined,
    modelType: model_type || undefined,
    dateFrom: date_from || undefined,
    dateTo: date_to || undefined,
    page: page || 1,
    pageSize: pageSize || 25,
  });
  res.json(result);
});

// GET /api/activity-logs/users - قائمة الموظفين لتعبئة فلتر "حسب الموظف"
router.get('/users', requireAuth, checkPermission('view_activity_logs'), (req, res) => {
  const users = db.prepare('SELECT id, name FROM workers ORDER BY name').all();
  res.json({ users });
});

module.exports = router;
