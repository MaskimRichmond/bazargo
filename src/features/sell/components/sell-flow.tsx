"use client"

import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { sellFormSchema, type SellFormValues } from "../schema"
import { Button } from "@/components/ui/button"

import { TypeSelection } from "./steps/type-selection"
import { PhotoUpload } from "./steps/photo-upload"
import { ProductDetails } from "./steps/product-details"
import { DeliveryOptions } from "./steps/delivery-options"
import { PreviewStep } from "./steps/preview-step"

import { publishListing } from "@/app/actions/sell"

const DRAFT_KEY = "bazargo_sell_draft"

const STEPS = [
  { id: "type", title: "Тип" },
  { id: "photos", title: "Фото" },
  { id: "details", title: "Товар" },
  { id: "delivery", title: "Получение" },
  { id: "preview", title: "Проверка" },
]

export function SellFlow({ categories, userStore, initialData = null }: { categories: any[], userStore?: any, initialData?: any }) {
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const methods = useForm<SellFormValues>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: initialData || {
      type: "SINGLE",
      images: [],
      title: "",
      categoryId: "",
      price: 0,
      condition: "USED_GOOD",
      description: "",
      quantity: 1,
      region: "Бишкек",
      city: "Бишкек",
      deliveryMethods: ["PICKUP"],
      publishAsStore: false,
      showPhone: false
    },
    mode: "onChange",
  })

  // Load Draft
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        // Only load primitive values to avoid breaking file objects
        methods.reset({
          ...parsed,
          images: [], // reset images as File objects cannot be stored in localStorage
        })
      } catch (e) {
        console.error("Failed to load draft", e)
      }
    }
  }, [methods])

  // Save Draft on change
  useEffect(() => {
    const subscription = methods.watch((value) => {
      const draft = { ...value, images: [] } // exclude images
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    })
    return () => subscription.unsubscribe()
  }, [methods.watch])

  const handleNext = async () => {
    // Validate current step
    let fieldsToValidate: any[] = []
    if (currentStepIndex === 0) fieldsToValidate = ["type"]
    else if (currentStepIndex === 1) fieldsToValidate = ["images"]
    else if (currentStepIndex === 2) fieldsToValidate = ["title", "categoryId", "price", "condition", "description", "quantity", "city"]
    else if (currentStepIndex === 3) fieldsToValidate = ["deliveryMethods"]

    const isValid = await methods.trigger(fieldsToValidate as any)
    if (isValid) {
      const nextStep = Math.min(currentStepIndex + 1, STEPS.length - 1)
      if (process.env.NODE_ENV === "development") {
        console.log(`[SELL_FLOW] Step changed: ${currentStepIndex + 1} -> ${nextStep + 1}`)
      }
      setCurrentStepIndex(nextStep)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      router.back()
    }
  }

  const onSubmit = async (data: SellFormValues) => {
    if (currentStepIndex !== STEPS.length - 1) return
    
    if (process.env.NODE_ENV === "development") {
      console.log("[SELL_PUBLISH] Publish started", data)
    }

    setError(null)
    setIsPublishing(true)
    
    try {
      // Create FormData to send to server action (especially for files)
      const formData = new FormData()
      if (initialData?.id) formData.append('id', initialData.id)
      formData.append('type', data.type)
      formData.append('title', data.title)
      formData.append('categoryId', data.categoryId)
      formData.append('price', data.price.toString())
      formData.append('condition', data.condition)
      formData.append('description', data.description)
      formData.append('quantity', data.quantity?.toString() || "1")
      formData.append('region', data.region)
      formData.append('city', data.city)
      formData.append('deliveryMethods', JSON.stringify(data.deliveryMethods))
      formData.append('publishAsStore', String(data.publishAsStore || false))
      formData.append('showPhone', String(data.showPhone || false))
      
      // Append images
      data.images.forEach((img, index) => {
        if (img.file) {
          formData.append(`image_${index}`, img.file)
        }
      })

      const result = await publishListing(formData)
      
      if (result.success) {
        localStorage.removeItem(DRAFT_KEY)
        router.push(`/product/${result.listingId}?published=true`)
      } else {
        throw new Error(result.error || "Ошибка публикации")
      }
    } catch (err: any) {
      setError(err.message)
      setIsPublishing(false)
    }
  }

  const CurrentStepComponent = [
    TypeSelection,
    PhotoUpload,
    ProductDetails,
    DeliveryOptions,
    PreviewStep
  ][currentStepIndex]

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => e.preventDefault()} className="pb-24 max-w-2xl mx-auto">
        
        {/* Header / Progress */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b pb-4 pt-4 px-4 mb-6">
          <div className="flex items-center mb-4">
            <button 
              type="button" 
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors mr-2"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Разместить объявление</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${
                  idx <= currentStepIndex ? "bg-primary" : "bg-muted"
                }`} />
                <span className={`text-[10px] mt-1.5 block font-medium transition-colors line-clamp-1 ${
                  idx === currentStepIndex ? "text-primary" : "text-muted-foreground"
                }`}>
                  {idx + 1}. {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CurrentStepComponent categories={categories} userStore={userStore} />
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t z-50 pb-safe">
          <div className="max-w-2xl mx-auto flex gap-3">
            {currentStepIndex > 0 && (
              <Button type="button" variant="outline" className="w-1/3 h-12 rounded-xl font-semibold" onClick={handleBack} disabled={isPublishing}>
                Назад
              </Button>
            )}
            
            {currentStepIndex < STEPS.length - 1 ? (
              <Button type="button" className="flex-1 h-12 rounded-xl font-semibold" onClick={handleNext}>
                Далее
              </Button>
            ) : (
              <Button type="button" className="flex-1 h-12 rounded-xl font-semibold" disabled={isPublishing} onClick={methods.handleSubmit(onSubmit)}>
                {isPublishing ? "Публикация..." : "Опубликовать"}
              </Button>
            )}
          </div>
        </div>

      </form>
    </FormProvider>
  )
}
