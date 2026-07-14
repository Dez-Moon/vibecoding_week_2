"use client"

import { useState, useCallback, useRef } from "react"
import { getGreeting, sendChatMessageStream } from "@/lib/api"
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
  const messagesRef = useRef<ChatMessage[]>([])

  // Keep ref in sync with state so callbacks always send the latest messages
  const setMessagesSync = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessages(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater
      messagesRef.current = next
      return next
    })
  }, [])

  const loadGreeting = useCallback(async () => {
    if (greetingRef.current !== null) return greetingRef.current
    const { greeting } = await getGreeting(templateName)
    greetingRef.current = greeting
    setMessagesSync([{ role: "assistant", content: greeting }])
    return greeting
  }, [templateName])

  const send = useCallback((text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    setInput("")
    setIsLoading(true)

    const userMessage: ChatMessage = { role: "user", content }
    const assistantMessage: ChatMessage = { role: "assistant", content: "" }
    setMessagesSync(prev => [...prev, userMessage, assistantMessage])

    const controller = sendChatMessageStream(
      {
        messages: messagesRef.current,
        template_name: templateName,
        extracted_fields: extractedFields,
      },
      (chunk) => {
        setMessagesSync(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
          }
          return prev
        })
      },
      ({ response, extracted_fields, is_complete, missing_fields }) => {
        setExtractedFields(extracted_fields)
        setIsComplete(is_complete)
        setMissingFields(missing_fields)
        onFieldsExtracted?.(extracted_fields)
        setIsLoading(false)
      },
      () => {
        setMessagesSync(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: "Sorry, I ran into an error. Please try again." }]
          }
          return prev
        })
        setIsLoading(false)
      },
    )
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
