"use server"

import { createClient } from "@/lib/supabase/server"

export async function createReportAction({ 
  targetId, 
  targetType, 
  reason, 
  description 
}: { 
  targetId: string; 
  targetType: 'LISTING' | 'USER' | 'MESSAGE' | 'STORE'; 
  reason: string; 
  description?: string; 
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  // Rate Limiting (Simple check: Max 5 reports per day per user)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("reporter_id", user.id)
    .gte("created_at", today.toISOString())
    
  if (count !== null && count >= 10) {
    throw new Error("Rate limit exceeded. Please try again tomorrow.")
  }

  // Insert Report
  const { error } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id, // Enforced by RLS anyway, but explicitly passing it
      target_id: targetId,
      target_type: targetType,
      reason,
      description
    })

  if (error) {
    if (error.code === '23505') { // unique_active_report constraint
      throw new Error("You have already reported this item.")
    }
    throw new Error("Failed to submit report")
  }
  
  return { success: true }
}
