export interface NDATemplate {
  id: number
  name: string
  category: string
  description: string | null
  content: string
  default_variables: Record<string, string>
}

export interface TemplateListItem {
  id: number
  name: string
  category: string
  description: string | null
}

export interface RenderRequest {
  variables: Record<string, string>
}

export interface RenderResponse {
  template_id: number
  rendered_content: string
}

export interface NDAFormValues {
  party_a_name: string
  party_b_name: string
  effective_date: string
  purpose: string
  term_years: string
  governing_state: string
}

export interface User {
  id: number
  email: string
  name: string | null
}

export interface Document {
  id: number
  user_id: number
  template_id: number
  name: string
  doc_type: string
  content: string
  variables: Record<string, string> | null
}

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  email: string
  password: string
  name?: string
}

export interface AuthResponse {
  id: number
  email: string
  name: string | null
}

export interface DocumentCreate {
  template_id: number
  name: string
  doc_type: string
  content: string
  variables?: Record<string, string>
}

export interface DocumentUpdate {
  name?: string
  content?: string
  variables?: Record<string, string>
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface GreetingResponse {
  greeting: string
}

export interface ChatResponse {
  response: string
  extracted_fields: Record<string, string>
  is_complete: boolean
  missing_fields: string[]
}

export interface ChatRequest {
  messages: ChatMessage[]
  template_name: string
  extracted_fields: Record<string, string>
}
