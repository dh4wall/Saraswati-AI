/**
 * Typed HTTP client for the Saraswati AI FastAPI backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { createClient } from '@/lib/supabase/client'

export interface Paper {
    arxiv_id: string
    title: string
    authors: string[]
    abstract_snippet: string
    published: string | null
    pdf_url: string | null
    categories: string[]
    credibility?: 'HIGH' | 'MEDIUM' | 'UNCERTAIN'
}

export interface Project {
    id: string
    title: string
    description: string
    created_at: string
    paper_count: number
    status: 'active' | 'draft' | 'complete'
}

export interface Note {
    id: string
    project_id: string
    content: string
    source_paper_id?: string
    source_paper_title?: string
    created_at: string
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { ...headers, ...init?.headers },
    })

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`API error ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
}

/**
 * Fetch paper recommendations based on user interests.
 */
export async function getPaperRecommendations(
    interests: string[],
    limit = 4,
): Promise<Paper[]> {
    const params = new URLSearchParams({
        interests: interests.join(','),
        limit: String(limit),
    })
    return apiFetch<Paper[]>(`/api/v1/papers/recommendations?${params}`)
}

/**
 * Project Management
 */
export async function listProjects(): Promise<Project[]> {
    return apiFetch<Project[]>('/api/v1/projects/')
}

export async function createProject(title: string, description?: string): Promise<Project> {
    return apiFetch<Project>('/api/v1/projects/', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
    })
}

export async function getProject(id: string): Promise<Project> {
    return apiFetch<Project>(`/api/v1/projects/${id}`)
}

/**
 * Note Management
 */
export async function getProjectNotes(projectId: string): Promise<Note[]> {
    return apiFetch<Note[]>(`/api/v1/projects/${projectId}/notes`)
}

export async function createProjectNote(projectId: string, content: string, sourcePaperId?: string, sourcePaperTitle?: string): Promise<Note> {
    return apiFetch<Note>(`/api/v1/projects/${projectId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content, source_paper_id: sourcePaperId, source_paper_title: sourcePaperTitle }),
    })
}

export async function deleteProjectNote(projectId: string, noteId: string): Promise<void> {
    await apiFetch(`/api/v1/projects/${projectId}/notes/${noteId}`, { method: 'DELETE' })
}
