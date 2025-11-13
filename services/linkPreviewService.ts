// services/linkPreviewService.ts

export interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
  type?: 'website' | 'video' | 'image' | 'internal'
}

/**
 * Extract URLs from text
 */
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const matches = text.match(urlRegex)
  return matches || []
}

/**
 * Fetch link preview metadata
 * Note: In a production app, you'd want to use a backend service to fetch this
 * to avoid CORS issues and for better security
 */
export const fetchLinkPreview = async (url: string): Promise<LinkPreview | null> => {
  try {
    // Check if it's an internal tool/link
    if (isInternalLink(url)) {
      return {
        url,
        title: 'Internal Tool',
        description: 'Company internal resource',
        type: 'internal',
      }
    }

    // For external URLs, we'll use a simple fetch approach
    // In production, use a backend API endpoint that fetches the metadata
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
      },
    })

    if (!response.ok) {
      return {
        url,
        title: url,
        type: 'website',
      }
    }

    const html = await response.text()
    
    // Simple HTML parsing (in production, use a proper HTML parser)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : undefined

    const metaDescriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    const description = metaDescriptionMatch ? metaDescriptionMatch[1].trim() : undefined

    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    const image = ogImageMatch ? ogImageMatch[1].trim() : undefined

    const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
    const siteName = ogSiteNameMatch ? ogSiteNameMatch[1].trim() : undefined

    return {
      url,
      title: title || url,
      description,
      image,
      siteName,
      type: image ? 'image' : 'website',
    }
  } catch (error) {
    console.error('Error fetching link preview:', error)
    // Return basic preview on error
    return {
      url,
      title: url,
      type: 'website',
    }
  }
}

/**
 * Check if URL is an internal company link
 */
const isInternalLink = (url: string): boolean => {
  // Add your internal domain patterns here
  const internalPatterns = [
    /^https?:\/\/.*\.yourcompany\.com/i,
    /^https?:\/\/internal\./i,
    /^https?:\/\/localhost/i,
    /^https?:\/\/127\.0\.0\.1/i,
  ]

  return internalPatterns.some(pattern => pattern.test(url))
}

/**
 * Batch fetch link previews
 */
export const fetchLinkPreviews = async (urls: string[]): Promise<Map<string, LinkPreview>> => {
  const previews = new Map<string, LinkPreview>()

  // Fetch in parallel with limit
  const batchSize = 5
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async url => {
        const preview = await fetchLinkPreview(url)
        return preview ? [url, preview] : null
      })
    )

    results.forEach(result => {
      if (result) {
        previews.set(result[0], result[1])
      }
    })
  }

  return previews
}

