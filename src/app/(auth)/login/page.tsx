import { PhoneAuthForm } from "@/features/auth/components/phone-auth-form"
import { ShoppingBag } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

export const metadata = {
  title: "Войти | BazarGo",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center mb-8">
        <Link href="/" className="flex items-center gap-2 mb-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-sm">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-muted">
          <Suspense fallback={<div className="h-64 flex items-center justify-center">Загрузка...</div>}>
            <PhoneAuthForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
