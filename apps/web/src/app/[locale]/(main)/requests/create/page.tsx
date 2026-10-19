import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BazaarOsCreateRfq } from "@/features/requests/components/bazaar-os-create-rfq"

export const metadata = {
  title: "BazaarOS • AI Procurement Assistant | Создание B2B-запроса",
  description: "AI-ассистент B2B-закупок BazaarOS. Автоматический разбор спецификации и сбор лучших коммерческих предложений от поставщиков Кыргызстана."
}

export default async function CreateRequestPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const searchParams = await props.searchParams
  const promptParam = searchParams?.prompt || ""

  if (!session) {
    const redirectUrl = promptParam 
      ? `/login?redirect_to=${encodeURIComponent(`/requests/create?prompt=${encodeURIComponent(promptParam)}`)}`
      : "/login?redirect_to=/requests/create"
    redirect(redirectUrl)
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 md:py-12 px-4">
      <BazaarOsCreateRfq initialPrompt={promptParam} />
    </div>
  )
}
