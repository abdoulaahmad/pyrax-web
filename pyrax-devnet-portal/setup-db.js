import pg from 'pg';

async function setup() {
  const credentials = [
    { user: 'postgres', pass: 'postgres' },
    { user: 'postgres', pass: 'password' },
    { user: 'bugyman', pass: 'bugyman' },
    { user: 'bugyman', pass: 'password' },
    { user: 'root', pass: 'root' }
  ];
  let client = null;
  let connectedUser = null;

  for (const { user, pass } of credentials) {
    try {
      console.log(`Trying to connect as user "${user}" with password "${pass}"...`);
      client = new pg.Client({ connectionString: `postgres://${user}:${pass}@localhost:5432/postgres` });
      await client.connect();
      connectedUser = user;
      console.log(`✅ Successfully connected as "${user}"!`);
      break;
    } catch (err) {
      console.log(`❌ Failed as "${user}": ${err.message}`);
      client = null;
    }
  }

  if (!client) {
    console.error('\nCould not connect to PostgreSQL with any default usernames.');
    console.error('If you have a specific password for your local Postgres, please edit your .env file instead.');
    process.exit(1);
  }

  try {
    console.log('\nCreating "dev" user...');
    await client.query("CREATE USER dev WITH PASSWORD 'pass';");
    console.log('✅ User "dev" created (or already exists).');
  } catch (err) {
    if (err.code === '42710') { // duplicate_object
      console.log('✅ User "dev" already exists.');
    } else {
      console.error('Failed to create user:', err.message);
    }
  }

  try {
    console.log('\nCreating "devnet_tester" database...');
    await client.query("CREATE DATABASE devnet_tester OWNER dev;");
    console.log('✅ Database "devnet_tester" created!');
  } catch (err) {
    if (err.code === '42P04') { // duplicate_database
      console.log('✅ Database "devnet_tester" already exists.');
    } else {
      console.error('Failed to create database:', err.message);
    }
  }

  await client.end();
  console.log('\n🎉 Database setup complete! You can now restart `npm run dev`.');
}

setup();
