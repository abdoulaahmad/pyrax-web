import pg from 'pg';

async function check() {
  const client = new pg.Client({ connectionString: 'postgres://dev:pass@localhost:5433/devnet_tester' });
  await client.connect();
  const res = await client.query('SELECT * FROM testers WHERE email = $1', ['test@example.com']);
  console.log(res.rows[0]);
  
  const mRes = await client.query('SELECT * FROM mission_progress WHERE tester_id = $1', [res.rows[0]?.id]);
  console.log('Missions:', mRes.rows);
  
  await client.end();
}
check();
