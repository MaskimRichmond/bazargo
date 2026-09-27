const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function runTests() {
  let passed = 0;
  let failed = 0;
  const adminId = 'a0000000-0000-0000-0000-000000000003';
  const targetId = 'a0000000-0000-0000-0000-000000000005';

  console.log("--- BAZARGO SECURITY VERIFICATION SCRIPT ---");

  // TEST 1: Anon calling admin_block_user
  console.log("\n1. Testing anon calling admin_block_user...");
  const { data: d1, error: e1 } = await anonClient.rpc("admin_block_user", {
    p_actor_id: adminId,
    p_target_user_id: targetId,
    p_reason: 'test'
  });
  if (e1 && e1.message.includes('admin_block_user: only callable via service_role')) {
      // Actually if RLS/grants are properly set, anon gets "function admin_block_user does not exist" or permission denied before the function even runs.
  }
  if (e1 && (e1.code === '42501' || e1.message.includes('not exist') || e1.message.includes('permission denied'))) {
    console.log("✅ PASS: Anon was rejected at the PG grant level or by RPC.");
    passed++;
  } else if (e1 && e1.message.includes('only callable via service_role')) {
    console.log("✅ PASS: Anon was rejected by RPC internal check.");
    passed++;
  } else {
    console.error("❌ FAIL: Anon result: ", {d1, e1});
    failed++;
  }

  // TEST 2: Service_role calling with missing actor_id
  console.log("\n2. Testing service_role calling with missing actor_id...");
  const { data: d2, error: e2 } = await adminClient.rpc("admin_block_user", {
    p_actor_id: null,
    p_target_user_id: targetId,
    p_reason: 'test'
  });
  if (e2 && e2.message.includes('missing actor_id')) {
    console.log("✅ PASS: Missing actor_id rejected.");
    passed++;
  } else {
    console.error("❌ FAIL: Result: ", {d2, e2});
    failed++;
  }

  // TEST 3: Attempting to call process_account_deletion via anon
  console.log("\n3. Testing anon calling process_account_deletion...");
  const { data: d3, error: e3 } = await anonClient.rpc("process_account_deletion", {
    p_user_id: targetId
  });
  if (e3 && (e3.code === '42501' || e3.message.includes('not exist') || e3.message.includes('permission denied') || e3.message.includes('only callable via service_role'))) {
    console.log("✅ PASS: Anon rejected from process_account_deletion.");
    passed++;
  } else {
    console.error("❌ FAIL: Result: ", {d3, e3});
    failed++;
  }

  // TEST 4: Querying Storage objects via service_role (Checking schema access)
  console.log("\n4. Testing Storage objects fetch via service_role...");
  const { data: d4, error: e4 } = await adminClient
    .schema('storage')
    .from('objects')
    .select('bucket_id, name')
    .limit(1);
    
  if (e4) {
    console.error("❌ FAIL: Error fetching storage objects: ", e4);
    failed++;
  } else {
    console.log("✅ PASS: Storage objects fetch succeeded. Rows:", d4?.length);
    passed++;
  }

  console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
}

runTests();
