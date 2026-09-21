import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use the service_role key to bypass RLS and execute the protected RPC.
// Vercel Cron will send a CRON_SECRET in the Authorization header.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // In local dev, process.env.CRON_SECRET might not be set. Ensure it is required in prod.
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // If CRON_SECRET is missing from env, we still reject to prevent arbitrary execution,
      // unless we want to allow it for local testing (but user requested strict protection).
      // Let's strictly require it.
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration error' }, { status: 500 });
    }

    // Create a Supabase client with the service role key to bypass RLS
    // and execute the SECURITY DEFINER RPC.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc('expire_pending_orders');

    if (error) {
      console.error('Error executing expire_pending_orders:', error);
      return NextResponse.json({ error: 'Failed to expire orders' }, { status: 500 });
    }

    return NextResponse.json({ success: true, expiredCount: data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in cron endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
