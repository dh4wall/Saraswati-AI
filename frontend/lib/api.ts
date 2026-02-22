/**
 * Typed HTTP client for the Saraswati AI FastAPI backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface Paper {
    arxiv_id: string
    title: string
    authors: string[]
    abstract_snippet: string
    published: string | null
    pdf_url: string | null
    categories: string[]
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    })
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`API error ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
}

/**
 * Fetch paper recommendations based on user interests.
 * @param interests Array of topic strings from the user's profile.
 * @param limit     Number of papers to return (default 4).
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
