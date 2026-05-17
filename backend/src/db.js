const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('./config');

let pool;

function getPool() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required for lead storage.');
  }

  if (!pool) {
    const useSsl = config.databaseSsl === 'true' || config.databaseSsl === 'require';
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }

  return pool;
}

async function ensureSchema() {
  const schemaPath = path.join(__dirname, '..', 'migrations', '001_create_leads.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await getPool().query(schema);
}

async function createLead(lead) {
  const sql = `
    INSERT INTO leads (
      form_type, full_name, email, company, role, phone, team_size,
      message, operational_problem, source_page, status, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'new',$11)
    RETURNING *
  `;
  const values = [
    lead.form_type,
    lead.full_name,
    lead.email,
    lead.company || null,
    lead.role || null,
    lead.phone || null,
    lead.team_size || null,
    lead.message || null,
    lead.operational_problem || null,
    lead.source_page || null,
    JSON.stringify(lead.metadata || {})
  ];
  const result = await getPool().query(sql, values);
  return result.rows[0];
}

async function listLeads({ formType, status, limit = 50 }) {
  const where = [];
  const values = [];

  if (formType) {
    values.push(formType);
    where.push(`form_type = $${values.length}`);
  }

  if (status) {
    values.push(status);
    where.push(`status = $${values.length}`);
  }

  values.push(Math.min(Number(limit) || 50, 200));
  const limitParam = `$${values.length}`;

  const sql = `
    SELECT id, created_at, form_type, full_name, email, company, status, source_page
    FROM leads
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC
    LIMIT ${limitParam}
  `;

  const result = await getPool().query(sql, values);
  return result.rows;
}

async function getLead(id) {
  const result = await getPool().query('SELECT * FROM leads WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateLeadStatus(id, status) {
  const result = await getPool().query(
    'UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
}

async function healthCheck() {
  await getPool().query('SELECT 1');
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  ensureSchema,
  createLead,
  listLeads,
  getLead,
  updateLeadStatus,
  healthCheck,
  closePool
};
