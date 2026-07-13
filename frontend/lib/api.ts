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
  return apiFetch<GreetingResponse>(`/chat/greeting?${params}`)
}

export function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/chat/message", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
