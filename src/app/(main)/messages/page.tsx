import { MessageSquare } from "lucide-react"

export const metadata = {
  title: "Сообщения | BazarGo"
}

export default function MessagesPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 opacity-50" />
      </div>
      <h2 className="text-xl font-medium mb-2 text-foreground">Выберите чат</h2>
      <p className="text-sm max-w-[250px]">
        Выберите диалог из списка слева, чтобы начать общение
      </p>
    </div>
  )
}
