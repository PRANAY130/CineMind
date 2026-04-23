const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_ZXK5CDkezd9l@ep-plain-rain-a1kzan52-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('./better-auth-schema.sql', 'utf8');

async function run() {
  try {
    await pool.query(sql);
    console.log('✅ Better Auth schema created successfully in NeonDB!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
