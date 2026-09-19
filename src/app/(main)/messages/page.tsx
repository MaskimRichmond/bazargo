import { MessageSquare } from "lucide-react"

export const metadata = {
  title: "Сообщения | BazarGo"
}

export default function MessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-muted/5">
      <div className="w-20 h-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-5">
        <MessageSquare className="w-10 h-10" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-foreground">Выберите диалог</h2>
      <p className="text-[15px] text-muted-foreground max-w-sm">
        Здесь появится переписка по вашим объявлениям. Выберите чат слева, чтобы продолжить общение.
      </p>
    </div>
  )
}
