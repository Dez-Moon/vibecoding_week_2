import type { ChatRequest, ChatResponse, GreetingResponse, NDATemplate, RenderRequest, RenderResponse, TemplateListItem } from "./types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

export function getTemplate(id: number): Promise<NDATemplate> {
  return apiFetch<NDATemplate>(`/templates/${id}`)
}

export function listTemplates(): Promise<TemplateListItem[]> {
  return apiFetch<TemplateListItem[]>("/templates/")
}

export function renderTemplate(
  templateId: number,
  body: RenderRequest
): Promise<RenderResponse> {
  return apiFetch<RenderResponse>(`/templates/${templateId}/render`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function getGreeting(templateName: string): Promise<GreetingResponse> {
  const params = new URLSearchParams({ template_name: templateName })
  return apiFetch<GreetingResponse>(`/api/chat/greeting?${params}`)
}

export function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat/message", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function sendChatMessageStream(
  payload: ChatRequest,
  onChunk: (text: string) => void,
  onDone: (response: ChatResponse) => void,
  onError: (err: Error) => void,
) {
  const controller = new AbortController()
  fetch(`${API_BASE}/api/chat/message/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`API error ${res.status}: ${body}`)
      }
      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") continue
          try {
            const event = JSON.parse(data)
            if (event.type === "text") {
              onChunk(event.content)
            } else if (event.type === "done") {
              onDone({
                response: event.response,
                extracted_fields: event.extracted_fields,
                is_complete: event.is_complete,
                missing_fields: event.missing_fields,
              })
            }
          } catch {
            // skip malformed
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err)
    })
  return controller
}
