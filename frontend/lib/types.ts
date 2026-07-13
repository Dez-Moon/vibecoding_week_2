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
