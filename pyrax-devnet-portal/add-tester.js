import pg from 'pg';

async function addTester() {
  const client = new pg.Client({ connectionString: 'postgres://dev:pass@localhost:5433/devnet_tester' });

  try {
    await client.connect();

    // Create a new tester ID
    const id = `t_${Date.now()}`;
    const email = process.argv[2] || `test_${Date.now()}@example.com`;
    const now = Date.now();

    await client.query(
      `INSERT INTO testers (id, email, display_name, handle, reward_eligible, is_staff, is_superuser, status, permissions, created_at, joined_at)
       VALUES ($1, $2, 'Test User', $4, TRUE, FALSE, FALSE, 'active', '["dashboard.view", "issues.view", "issues.submit", "campaigns.view"]'::jsonb, $3, $3)
       ON CONFLICT (email) DO UPDATE SET status = 'active'`,
      [id, email, now, `tester_${Date.now()}`]
    );

    console.log(`✅ Successfully added ${email} to the database!`);
  } catch (err) {
    console.error('❌ Failed to add tester:', err.message);
  } finally {
    await client.end();
  }
}

addTester();
