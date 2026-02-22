// Shared TypeScript types for Saraswati AI

export type UserProfile = {
    id: string
    email: string
    display_name: string | null
    education_level: 'high_school' | 'undergraduate' | 'graduate' | 'phd' | 'professional'
    interests: string[]
    avatar_url: string | null
    created_at: string
}

export type Project = {
    id: string
    user_id: string
    title: string
    description: string | null
    created_at: string
    updated_at: string
}

export type Paper = {
    id: string
    arxiv_id: string
    title: string
    authors: string[]
    abstract: string
    published_date: string
    pdf_url: string
    ingested: boolean
}

export type ChatMessage = {
    id: string
    project_id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    agent?: string
    created_at: string
}

export type AgentStatus = 'idle' | 'running' | 'done' | 'error'
