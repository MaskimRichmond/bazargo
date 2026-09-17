import { useCallback, useRef } from "react"
import { useFormContext, useFieldArray } from "react-hook-form"
import { ImagePlus, X, GripVertical } from "lucide-react"

export function PhotoUpload() {
  const { control, formState: { errors } } = useFormContext()
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "images"
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      
      // Validation limits
      const remainingSlots = 10 - fields.length
      const allowedFiles = newFiles.slice(0, remainingSlots)

      allowedFiles.forEach(file => {
        // Very basic validation
        if (file.type.startsWith("image/")) {
          append({
            file,
            url: URL.createObjectURL(file)
          })
        }
      })
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle Drag & Drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files)
      const remainingSlots = 10 - fields.length
      const allowedFiles = newFiles.slice(0, remainingSlots)

      allowedFiles.forEach(file => {
        if (file.type.startsWith("image/")) {
          append({
            file,
            url: URL.createObjectURL(file)
          })
        }
      })
    }
  }, [fields.length, append])

  const error = errors.images?.message as string

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Фотографии</h2>
        <p className="text-sm text-muted-foreground">Первое фото будет главным. Максимум 10 фото.</p>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {fields.map((field: any, index: number) => (
          <div key={field.id} className="relative aspect-square rounded-xl overflow-hidden group border border-border/50 bg-muted">
            <img src={field.url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
            
            {index === 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-[10px] font-medium text-center py-1">
                Главное
              </div>
            )}

            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute top-1 right-1 w-6 h-6 bg-background/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            
            {/* Simple reorder buttons instead of complex drag & drop for MVP */}
            <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {index > 0 && (
                <button type="button" onClick={() => move(index, index - 1)} className="w-6 h-6 bg-background/80 backdrop-blur rounded-full flex items-center justify-center text-xs font-bold">&lt;</button>
              )}
              {index < fields.length - 1 && (
                <button type="button" onClick={() => move(index, index + 1)} className="w-6 h-6 bg-background/80 backdrop-blur rounded-full flex items-center justify-center text-xs font-bold">&gt;</button>
              )}
            </div>
          </div>
        ))}

        {fields.length < 10 && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="w-8 h-8 opacity-50" />
            <span className="text-xs font-medium">Добавить</span>
          </div>
        )}
      </div>

      <input 
        type="file" 
        multiple 
        accept="image/jpeg, image/png, image/webp" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  )
}
