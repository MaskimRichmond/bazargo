"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Phone as PhoneIcon } from "lucide-react"

export function PhoneAuthForm() {
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email")
  const [step, setStep] = useState<"input" | "otp">("input")
  const [name, setName] = useState("")
  const [identifier, setIdentifier] = useState("") // email or phone
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [countdown, setCountdown] = useState(0)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabase = supabaseUrl ? createClient() : null

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    
    if (!supabase) {
      setError("ОШИБКА: Файл .env.local не настроен. Ключи Supabase отсутствуют.")
      return
    }

    if (!name || name.trim().length < 2) {
      setError("Пожалуйста, введите ваше имя")
      return
    }

    if (!identifier) {
      setError(authMethod === "email" ? "Введите email" : "Введите номер телефона")
      return
    }

    setIsLoading(true)

    try {
      let authError;
      
      if (authMethod === "email") {
        const { error } = await supabase.auth.signInWithOtp({
          email: identifier,
          options: {
            data: { full_name: name.trim() }
          }
        })
        authError = error
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: identifier,
          options: {
            data: { full_name: name.trim() }
          }
        })
        authError = error
      }

      if (authError) throw authError
      
      setStep("otp")
      setCountdown(60)
    } catch (err: any) {
      console.error("[AUTH_DIAGNOSTICS] signInWithOtp failed:", {
        message: err.message,
        name: err.name,
        status: err.status,
        code: err.code,
      });

      if (err.message?.includes("rate limit") || err.status === 429) {
        setError("Слишком много попыток. Попробуйте позже.")
      } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setError("ОШИБКА: Файл .env.local не настроен. Ключи Supabase отсутствуют.")
      } else if (err.message?.includes("Unsupported phone provider") || err.message?.includes("sms provider")) {
        setError("Вход по телефону пока недоступен: SMS-провайдер не настроен.")
      } else {
        setError(authMethod === "email" ? "Проверьте правильность email" : "Проверьте номер телефона")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!supabase) return

    if (!otp || otp.length < 4) {
      setError("Код введён неверно")
      return
    }

    setIsLoading(true)

    try {
      let data, authError;

      if (authMethod === "email") {
        const res = await supabase.auth.verifyOtp({
          email: identifier,
          token: otp,
          type: "email",
        })
        data = res.data
        authError = res.error
      } else {
        const res = await supabase.auth.verifyOtp({
          phone: identifier,
          token: otp,
          type: "sms",
        })
        data = res.data
        authError = res.error
      }

      if (authError) throw authError

      if (data?.session) {
        const rawRedirect = searchParams.get("redirect_to")
        let redirectTo = "/profile"
        if (rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
          redirectTo = rawRedirect
        }
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err: any) {
      console.error("[AUTH_DIAGNOSTICS] verifyOtp failed:", {
        message: err.message,
        name: err.name,
        status: err.status,
        code: err.code,
      });
      if (err.message?.includes("expired")) {
        setError("Код истёк")
      } else {
        setError("Код введён неверно")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Войти или зарегистрироваться</h1>
        <p className="text-sm text-muted-foreground">
          {step === "input" 
            ? "Продолжая, вы соглашаетесь с правилами BazarGo." 
            : `Код отправлен на ${identifier}`}
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-xl text-center border border-destructive/20 font-medium">
          {error}
        </div>
      )}

      {step === "input" ? (
        <Tabs defaultValue="email" onValueChange={(v) => setAuthMethod(v as "email" | "phone")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 h-12 rounded-xl">
            <TabsTrigger value="email" className="rounded-lg gap-2 text-sm">
              <Mail className="w-4 h-4" /> Email (Dev)
            </TabsTrigger>
            <TabsTrigger value="phone" className="rounded-lg gap-2 text-sm">
              <PhoneIcon className="w-4 h-4" /> Телефон
            </TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                type="text"
                placeholder="Как к вам обращаться?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 bg-muted/50 border-border"
              />
            </div>
            
            <div className="space-y-2 text-left">
              <Label htmlFor="identifier">
                {authMethod === "email" ? "Email адрес" : "Номер телефона"}
              </Label>
              <Input
                id="identifier"
                type={authMethod === "email" ? "email" : "tel"}
                placeholder={authMethod === "email" ? "example@email.com" : "+996 555 000 000"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 bg-muted/50 border-border tracking-wider"
                dir="ltr"
              />
            </div>
            
            <Button type="submit" className="w-full h-12 text-base font-semibold shadow-sm rounded-xl" disabled={isLoading}>
              {isLoading ? "Отправка..." : "Получить код"}
            </Button>
          </form>
        </Tabs>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <Label htmlFor="otp">Введите код</Label>
              <button 
                type="button" 
                onClick={() => setStep("input")}
                className="text-xs text-primary hover:underline font-medium"
              >
                Изменить
              </button>
            </div>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={isLoading}
              required
              className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-muted/50 border-border"
              maxLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full h-12 text-base font-semibold shadow-sm rounded-xl" disabled={isLoading || otp.length < 4}>
            {isLoading ? "Проверка..." : "Подтвердить"}
          </Button>

          <div className="pt-4 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Отправить код повторно через {countdown} сек
              </p>
            ) : (
              <button 
                type="button"
                onClick={() => handleSendOtp()}
                className="text-sm text-primary font-medium hover:underline"
                disabled={isLoading}
              >
                Отправить код повторно
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
