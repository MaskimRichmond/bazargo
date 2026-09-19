const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2];
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing env");
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, supabaseKey);
const serviceClient = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Creating test users...");
  
  const { data: user1 } = await serviceClient.auth.admin.createUser({
    email: 'testA@example.com', password: 'password123', email_confirm: true, phone: '+996555000001'
  });
  const { data: user2 } = await serviceClient.auth.admin.createUser({
    email: 'testB@example.com', password: 'password123', email_confirm: true, phone: '+996555000002'
  });

  const uA = user1.user;
  const uB = user2.user;

  // Login User A
  const { data: authA } = await anonClient.auth.signInWithPassword({
    email: 'testA@example.com',
    password: 'password123'
  });
  const clientA = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${authA.session.access_token}` } }
  });

  console.log("--- CASE A: anon -> profile.phone ---");
  const { data: anonData, error: anonErr } = await anonClient.from('profiles').select('phone').eq('id', uB.id);
  console.log("Anon result:", anonErr?.message || anonData);

  console.log("--- CASE B: User A -> User B profile.phone ---");
  const { data: bData, error: bErr } = await clientA.from('profiles').select('phone').eq('id', uB.id);
  console.log("User A result:", bErr?.message || bData);

  console.log("--- CASE C: User A -> own profile.phone ---");
  const { data: aData, error: aErr } = await clientA.from('profiles').select('phone').eq('id', uA.id);
  console.log("User A own result:", aErr?.message || aData);

  console.log("--- CASE D: Public profile -> safe fields ---");
  const { data: pubData, error: pubErr } = await anonClient.from('profiles').select('full_name, avatar_url, city').eq('id', uB.id);
  console.log("Public data:", pubErr?.message || pubData);

  console.log("--- CASE M: Public profile -> role ---");
  const { data: roleData, error: roleErr } = await anonClient.from('profiles').select('role').eq('id', uB.id);
  console.log("Role result:", roleErr?.message || roleData);

  // Clean up
  await serviceClient.auth.admin.deleteUser(uA.id);
  await serviceClient.auth.admin.deleteUser(uB.id);
  console.log("Cleaned up");
}

run().catch(console.error);
