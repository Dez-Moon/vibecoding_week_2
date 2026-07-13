"use client"

import { useState, useCallback, useRef } from "react"
import { getGreeting, sendChatMessage } from "@/lib/api"
import type { ChatMessage, ChatResponse } from "@/lib/types"

interface UseChatOptions {
  templateName: string
  onFieldsExtracted?: (fields: Record<string, string>) => void
}

export function useChat({ templateName, onFieldsExtracted }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [extractedFields, setExtractedFields] = useState<Record<string, string>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const greetingRef = useRef<string | null>(null)

  const loadGreeting = useCallback(async () => {
    if (greetingRef.current !== null) return greetingRef.current
    const { greeting } = await getGreeting(templateName)
    greetingRef.current = greeting
    setMessages([{ role: "assistant", content: greeting }])
    return greeting
  }, [templateName])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    setInput("")
    setIsLoading(true)

    const userMessage: ChatMessage = { role: "user", content }

    try {
      const { response, extracted_fields, is_complete, missing_fields }: ChatResponse =
        await sendChatMessage({
          messages: messages, // eslint-disable-line react-hooks/exhaustive-deps -- stale closure intentional: we send the messages captured at callback creation time
          template_name: templateName,
          extracted_fields: extractedFields, // eslint-disable-line react-hooks/exhaustive-deps -- stale closure intentional: API merges with server-side state
        })

      const assistantMessage: ChatMessage = { role: "assistant", content: response }
      setMessages(prev => [...prev, userMessage, assistantMessage])
      setExtractedFields(extracted_fields)
      setIsComplete(is_complete)
      setMissingFields(missing_fields)
      onFieldsExtracted?.(extracted_fields)
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Sorry, I ran into an error. Please try again.",
      }
      setMessages(prev => [...prev, userMessage, errorMsg])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isLoading, templateName, onFieldsExtracted])

  return {
    messages,
    input,
    setInput,
    send,
    isLoading,
    extractedFields,
    isComplete,
    missingFields,
    loadGreeting,
  }
}
