// components/chat/LinkPreview.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { LinkPreview as LinkPreviewType, fetchLinkPreview, extractUrls } from '../../services/linkPreviewService'
import { Ionicons } from '@expo/vector-icons'

interface LinkPreviewProps {
  url: string
  onPress?: (url: string) => void
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url, onPress }) => {
  const [preview, setPreview] = useState<LinkPreviewType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true)
        const data = await fetchLinkPreview(url)
        setPreview(data)
      } catch (err) {
        console.error('Error loading link preview:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [url])

  const handlePress = () => {
    if (onPress) {
      onPress(url)
    } else {
      Linking.openURL(url).catch(err => console.error('Failed to open URL:', err))
    }
  }

  if (loading) {
    return (
      <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Loading preview...</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (error || !preview) {
    return (
      <TouchableOpacity style={styles.linkContainer} onPress={handlePress} activeOpacity={0.7}>
        <Ionicons name="link" size={16} color="#6366F1" />
        <Text style={styles.linkText} numberOfLines={1}>{url}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity style={styles.previewContainer} onPress={handlePress} activeOpacity={0.8}>
      {preview.image && (
        <Image source={{ uri: preview.image }} style={styles.previewImage} resizeMode="cover" />
      )}
      <View style={styles.previewContent}>
        {preview.siteName && (
          <Text style={styles.siteName} numberOfLines={1}>
            {preview.siteName}
          </Text>
        )}
        <Text style={styles.previewTitle} numberOfLines={2}>
          {preview.title}
        </Text>
        {preview.description && (
          <Text style={styles.previewDescription} numberOfLines={2}>
            {preview.description}
          </Text>
        )}
        <View style={styles.previewFooter}>
          <Ionicons name="link" size={12} color="#64748b" />
          <Text style={styles.previewUrl} numberOfLines={1}>
            {new URL(url).hostname}
          </Text>
          {preview.type === 'internal' && (
            <View style={styles.internalBadge}>
              <Text style={styles.internalBadgeText}>Internal</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

/**
 * Component to render link previews from message text
 */
interface MessageLinkPreviewsProps {
  content: string
  onLinkPress?: (url: string) => void
}

export const MessageLinkPreviews: React.FC<MessageLinkPreviewsProps> = ({ content, onLinkPress }) => {
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    const extracted = extractUrls(content)
    setUrls(extracted)
  }, [content])

  if (urls.length === 0) return null

  return (
    <View style={styles.previewsContainer}>
      {urls.map((url, index) => (
        <LinkPreview key={index} url={url} onPress={onLinkPress} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 6,
    gap: 6,
  },
  linkText: {
    fontSize: 13,
    color: '#6366F1',
    flex: 1,
  },
  previewContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  previewImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
  },
  previewContent: {
    padding: 12,
  },
  siteName: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 20,
  },
  previewDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 8,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewUrl: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  internalBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  internalBadgeText: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '600',
  },
  previewsContainer: {
    gap: 8,
  },
})

