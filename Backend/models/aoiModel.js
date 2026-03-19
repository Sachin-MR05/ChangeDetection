const db = require('../config/db');

const initializeAoiTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS public.saved_aois (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bbox JSONB NOT NULL,
      monitoring_frequency TEXT DEFAULT 'continuous',
      alert_threshold DECIMAL(5,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await db.query(query);
};

const createAoiEntry = async (userId, name, bbox, monitoringFrequency = 'continuous', alertThreshold = null) => {
  const query = `
    INSERT INTO public.saved_aois (user_id, name, bbox, monitoring_frequency, alert_threshold)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [userId, name, JSON.stringify(bbox), monitoringFrequency, alertThreshold];
  const { rows } = await db.query(query, values);
  return rows[0];
};

const getAoisByUser = async (userId) => {
  const query = `
    SELECT id, name, bbox, monitoring_frequency, alert_threshold, created_at
    FROM public.saved_aois
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await db.query(query, [userId]);
  return rows;
};

const updateAoiMonitoring = async (userId, aoiId, monitoringFrequency, alertThreshold) => {
  const query = `
    UPDATE public.saved_aois
    SET monitoring_frequency = COALESCE($3, monitoring_frequency),
        alert_threshold = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;
  const { rows } = await db.query(query, [aoiId, userId, monitoringFrequency, alertThreshold]);
  return rows[0];
};

const getAoiHistory = async (userId, aoiId) => {
  const bboxResult = await db.query(
    'SELECT bbox FROM public.saved_aois WHERE id = $1 AND user_id = $2',
    [aoiId, userId]
  );

  if (bboxResult.rows.length === 0) {
    return [];
  }

  const bbox = bboxResult.rows[0].bbox;
  const query = `
    SELECT change_percentage, created_at
    FROM public.detection_history
    WHERE user_id = $1 AND bounding_box = $2::jsonb
    ORDER BY created_at ASC
  `;

  const { rows } = await db.query(query, [userId, bbox]);
  return rows;
};

module.exports = {
  initializeAoiTable,
  createAoiEntry,
  getAoisByUser,
  updateAoiMonitoring,
  getAoiHistory
};
