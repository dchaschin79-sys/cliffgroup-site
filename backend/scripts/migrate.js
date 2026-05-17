const { ensureSchema, closePool } = require('../src/db');

ensureSchema()
  .then(async () => {
    console.log('Lead database schema is ready.');
    await closePool();
  })
  .catch(async error => {
    console.error('Lead database migration failed:', error.message);
    await closePool();
    process.exit(1);
  });
