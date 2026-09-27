const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);

async function testLock() {
  const targetId = 'a0000000-0000-0000-0000-000000000005'; // arbitrary ID

  // Reset state
  await adminClient.from('account_deletion_requests').delete().eq('user_id', targetId);

  // 1. Simulate first request (acquiring lock)
  const req1 = adminClient.rpc('acquire_deletion_lock', { p_user_id: targetId });
  
  // 2. Simulate concurrent second request (attempting to acquire lock at exact same time)
  const req2 = adminClient.rpc('acquire_deletion_lock', { p_user_id: targetId });

  const [res1, res2] = await Promise.all([req1, req2]);

  console.log("Res1:", res1.error ? res1.error.message : "Success");
  console.log("Res2:", res2.error ? res2.error.message : "Success");
  
  if (res1.error && res2.error) {
     console.log("Both failed? Unexpected.");
  } else if (!res1.error && !res2.error) {
     console.log("Both succeeded? FAIL! Locking broken.");
  } else {
     console.log("✅ PASS: One succeeded, one failed with concurrent lock error.");
  }
}

testLock();
