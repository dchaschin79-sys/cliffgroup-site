require('dotenv').config();

const defaultOrigins = [
  'https://cliffgroupflorida.com',
  'https://www.cliffgroupflorida.com',
  'https://cliffgroup-site-production.up.railway.app',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];

function csv(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...csv(process.env.ALLOWED_ORIGINS)]));

module.exports = {
  port: Number(process.env.PORT || 8788),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: String(process.env.DATABASE_SSL || '').toLowerCase(),
  allowedOrigins,
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  internalNotificationEmail: process.env.INTERNAL_NOTIFICATION_EMAIL || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'Cliff Group Florida <hello@cliffgroup.software>',
  publicSiteUrl: process.env.PUBLIC_SITE_URL || 'https://cliffgroupflorida.com',
  emailEnabled: String(process.env.EMAIL_ENABLED || 'true').toLowerCase() !== 'false'
};
