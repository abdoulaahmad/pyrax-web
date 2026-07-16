import pg from 'pg';
import crypto from 'crypto';

const pool = new pg.Pool({ connectionString: 'postgres://dev:pass@localhost:5433/devnet_tester' });
const id = (p) => `${p}_${crypto.randomBytes(8).toString("base64url")}`;

async function seed() {
  const now = Date.now();
  
  // Seed Training
  await pool.query(`INSERT INTO training_lessons (id, title, content, lesson_order, required_for_cert, created_at) VALUES 
    ($1, 'Introduction to Pyrax', '{"body": "Welcome to Pyrax DevNet. In this lesson..."}', 1, true, $5),
    ($2, 'Node Setup & Security', '{"body": "Learn how to secure your node..."}', 2, true, $5)
    ON CONFLICT DO NOTHING`, [id('tl'), id('tl'), id('tl'), id('tl'), now]);

  // Seed Missions
  await pool.query(`INSERT INTO missions (id, mission_number, title, description, created_at) VALUES 
    ($1, 1, 'Profile & Onboarding', 'Complete your tester profile and setup.', $3),
    ($2, 2, 'First Node Sync', 'Download and sync the Inferno client.', $3)
    ON CONFLICT DO NOTHING`, [id('m'), id('m'), now]);

  console.log("Seeded test data!");
  process.exit(0);
}
seed().catch(console.error);
