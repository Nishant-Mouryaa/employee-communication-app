export interface Organization {
  id: string
  name: string
  slug?: string
  plan?: string
  is_active?: boolean
  metadata?: Record<string, any> | null
}

export interface OrganizationMembership {
  organization: Organization
  role?: string
}

