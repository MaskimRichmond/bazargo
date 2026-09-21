import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('stores').select('owner_id')
  if (error) {
    console.error(error)
    process.exit(1)
  }
  const counts = {}
  let hasDups = false
  for (const s of data) {
    counts[s.owner_id] = (counts[s.owner_id] || 0) + 1
    if (counts[s.owner_id] > 1) {
      hasDups = true
    }
  }
  console.log("Has Dups:", hasDups)
}
check()
