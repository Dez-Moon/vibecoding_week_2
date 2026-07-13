import type {
  AuthResponse,
  Document,
  DocumentCreate,
  DocumentUpdate,
  SignInRequest,
  SignUpRequest,
  User,
} from "./types"

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
    credentials: "include",
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

export async function signIn(body: SignInRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function signUp(body: SignUpRequest): Promise<User> {
  return apiFetch<User>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function signOut(): Promise<void> {
  await apiFetch<void>("/api/auth/signout", { method: "POST" })
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/api/auth/me")
}

export async function listDocuments(): Promise<Document[]> {
  return apiFetch<Document[]>("/api/documents/")
}

export async function saveDocument(body: DocumentCreate): Promise<Document> {
  return apiFetch<Document>("/api/documents/", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function getDocument(id: number): Promise<Document> {
  return apiFetch<Document>(`/api/documents/${id}`)
}

export async function updateDocument(
  id: number,
  body: DocumentUpdate
): Promise<Document> {
  return apiFetch<Document>(`/api/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export async function deleteDocument(id: number): Promise<void> {
  return apiFetch<void>(`/api/documents/${id}`, { method: "DELETE" })
}
