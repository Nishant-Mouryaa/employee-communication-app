// components/chat/SearchModal.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Message } from '../../types/chat'
import { searchMessages, searchAttachments, getMentionedMessages, SearchFilters } from '../../services/messageSearchService'
import { formatMessageTimestamp } from '../../utils/chatHelpers'
import { MessageBubble } from './MessageBubble'

interface SearchModalProps {
  visible: boolean
  onClose: () => void
  channelId?: string
  userId: string
  onMessagePress?: (messageId: string) => void
}

type SearchTab = 'all' | 'files' | 'mentions'

export const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onClose,
  channelId,
  userId,
  onMessagePress,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>('all')
  const [results, setResults] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const performSearch = useCallback(async () => {
    setLoading(true)
    try {
      let searchResults: Message[] = []

      switch (activeTab) {
        case 'all':
          // For 'all' tab, require a search query
          if (!searchQuery.trim()) {
            setResults([])
            setLoading(false)
            return
          }
          const filters: SearchFilters = {
            query: searchQuery,
            channelId,
          }
          searchResults = await searchMessages(filters, userId)
          break

        case 'files':
          // For 'files' tab, load all attachments (query is optional)
          searchResults = await searchAttachments(channelId || '', searchQuery || undefined)
          break

        case 'mentions':
          // For 'mentions' tab, load all mentions (query is optional)
          searchResults = await getMentionedMessages(userId, channelId)
          // Filter by search query if provided
          if (searchQuery.trim()) {
            searchResults = searchResults.filter(msg =>
              msg.content.toLowerCase().includes(searchQuery.toLowerCase())
            )
          }
          break
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery, channelId, userId])

  useEffect(() => {
    if (visible) {
      // For 'files' and 'mentions' tabs, load data even without search query
      if (activeTab === 'files' || activeTab === 'mentions') {
        performSearch()
      } else if (searchQuery.trim()) {
        // For 'all' tab, only search if there's a query
        performSearch()
      } else {
        setResults([])
      }
    } else {
      setResults([])
    }
  }, [searchQuery, activeTab, visible, performSearch])

  const handleMessagePress = (message: Message) => {
    if (onMessagePress) {
      onMessagePress(message.id)
    }
    onClose()
  }

  const renderResult = ({ item }: { item: Message }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleMessagePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultAuthor}>
          {item.profiles?.full_name || item.profiles?.username || 'Unknown'}
        </Text>
        <Text style={styles.resultTime}>
          {formatMessageTimestamp(item.created_at)}
        </Text>
      </View>
      <Text style={styles.resultContent} numberOfLines={2}>
        {item.content}
      </Text>
      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.attachmentBadge}>
          <Ionicons name="attach" size={12} color="#6366F1" />
          <Text style={styles.attachmentText}>
            {item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
      {item.channels && (
        <Text style={styles.channelName}>
          #{item.channels.name || 'channel'}
        </Text>
      )}
    </TouchableOpacity>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Messages</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages, files, mentions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'files' && styles.tabActive]}
            onPress={() => setActiveTab('files')}
          >
            <Text style={[styles.tabText, activeTab === 'files' && styles.tabTextActive]}>
              Files
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'mentions' && styles.tabActive]}
            onPress={() => setActiveTab('mentions')}
          >
            <Text style={[styles.tabText, activeTab === 'mentions' && styles.tabTextActive]}>
              Mentions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            contentContainerStyle={styles.resultsContent}
          />
        ) : searchQuery.trim() ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>
              Try different keywords or check your filters
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Start typing to search</Text>
            <Text style={styles.emptySubtext}>
              Search across messages, files, and mentions
            </Text>
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
  },
  resultItem: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  resultTime: {
    fontSize: 12,
    color: '#64748b',
  },
  resultContent: {
    fontSize: 14,
    color: '#334155',
    marginTop: 4,
    lineHeight: 20,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e0e7ff',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  attachmentText: {
    fontSize: 12,
    color: '#6366F1',
    marginLeft: 4,
    fontWeight: '500',
  },
  channelName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
})

