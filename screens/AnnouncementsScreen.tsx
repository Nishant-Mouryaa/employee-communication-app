// screens/AnnouncementsScreen.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Announcement {
  id: string
  title: string
  content: string
  author: string
  author_id: string
  date: string
  isImportant: boolean
  isPinned?: boolean
  created_at: string
  profiles?: {
    username: string
    full_name?: string
  }
  reactions?: AnnouncementReaction[]
  reaction_count?: number
  user_has_reacted?: boolean
}

interface AnnouncementReaction {
  id: string
  announcement_id: string
  user_id: string
  reaction_type: string
  created_at: string
}

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  const [isModalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterImportant, setFilterImportant] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    isImportant: false,
    isPinned: false
  })
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    fetchAnnouncements()
    setupRealtimeSubscription()
  }, [])

  useEffect(() => {
    filterAnnouncements()
  }, [announcements, searchQuery, filterImportant])

  const filterAnnouncements = () => {
    let filtered = [...announcements]

    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterImportant) {
      filtered = filtered.filter(item => item.isImportant)
    }

    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      if (a.isImportant && !b.isImportant) return -1
      if (!a.isImportant && b.isImportant) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    setFilteredAnnouncements(filtered)
  }

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles:author_id (
            username,
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const announcementsWithReactions = await Promise.all(
          data.map(async (item) => {
            const { data: reactions, error: reactionsError } = await supabase
              .from('announcement_reactions')
              .select('*')
              .eq('announcement_id', item.id)

            const userHasReacted = reactions?.some(r => r.user_id === user?.id) || false

            return {
              id: item.id,
              title: item.title,
              content: item.content,
              author: item.profiles?.full_name || item.profiles?.username || 'Unknown',
              author_id: item.author_id,
              date: new Date(item.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }),
              isImportant: item.is_important,
              isPinned: item.is_pinned || false,
              created_at: item.created_at,
              reactions: reactions || [],
              reaction_count: reactions?.length || 0,
              user_has_reacted: userHasReacted
            }
          })
        )

        setAnnouncements(announcementsWithReactions)
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
      Alert.alert('Error', 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchAnnouncements()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_reactions'
        },
        () => {
          fetchAnnouncements()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const postAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content')
      return
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to post announcements')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('announcements')
        .insert([
          {
            title: newAnnouncement.title.trim(),
            content: newAnnouncement.content.trim(),
            author_id: user.id,
            is_important: newAnnouncement.isImportant,
            is_pinned: newAnnouncement.isPinned
          }
        ])
        .select()

      if (error) throw error

      if (data) {
        setNewAnnouncement({ title: '', content: '', isImportant: false, isPinned: false })
        setModalVisible(false)
        Alert.alert('Success', 'Announcement posted successfully!')
      }
    } catch (error) {
      console.error('Error posting announcement:', error)
      Alert.alert('Error', 'Failed to post announcement')
    } finally {
      setLoading(false)
    }
  }

  const updateAnnouncement = async () => {
    if (!editingAnnouncement) return

    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('announcements')
        .update({
          title: newAnnouncement.title.trim(),
          content: newAnnouncement.content.trim(),
          is_important: newAnnouncement.isImportant,
          is_pinned: newAnnouncement.isPinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAnnouncement.id)
        .eq('author_id', user?.id)

      if (error) throw error

      Alert.alert('Success', 'Announcement updated successfully!')
      setEditingAnnouncement(null)
      setNewAnnouncement({ title: '', content: '', isImportant: false, isPinned: false })
      setModalVisible(false)
    } catch (error) {
      console.error('Error updating announcement:', error)
      Alert.alert('Error', 'Failed to update announcement')
    } finally {
      setLoading(false)
    }
  }

  const deleteAnnouncement = async (announcementId: string, authorId: string) => {
    if (user?.id !== authorId) {
      Alert.alert('Error', 'You can only delete your own announcements')
      return
    }

    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              
              await supabase
                .from('announcement_reactions')
                .delete()
                .eq('announcement_id', announcementId)

              const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', announcementId)

              if (error) throw error

              Alert.alert('Success', 'Announcement deleted successfully')
            } catch (error: any) {
              console.error('Error deleting announcement:', error)
              Alert.alert('Error', error.message || 'Failed to delete announcement')
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const toggleReaction = async (announcementId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to react')
      return
    }

    try {
      const announcement = announcements.find(a => a.id === announcementId)
      
      if (announcement?.user_has_reacted) {
        const { error } = await supabase
          .from('announcement_reactions')
          .delete()
          .eq('announcement_id', announcementId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('announcement_reactions')
          .insert({
            announcement_id: announcementId,
            user_id: user.id,
            reaction_type: 'like'
          })

        if (error) throw error
      }
    } catch (error) {
      console.error('Error toggling reaction:', error)
      Alert.alert('Error', 'Failed to update reaction')
    }
  }

  const togglePin = async (announcementId: string, currentPinStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentPinStatus })
        .eq('id', announcementId)

      if (error) throw error

      Alert.alert('Success', !currentPinStatus ? 'Announcement pinned' : 'Announcement unpinned')
    } catch (error) {
      console.error('Error toggling pin:', error)
      Alert.alert('Error', 'Failed to update pin status')
    }
  }

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setNewAnnouncement({
      title: announcement.title,
      content: announcement.content,
      isImportant: announcement.isImportant,
      isPinned: announcement.isPinned || false
    })
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setEditingAnnouncement(null)
    setNewAnnouncement({ title: '', content: '', isImportant: false, isPinned: false })
  }

  const clearSearch = () => {
    setSearchQuery('')
    setFilterImportant(false)
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>Announcements</Text>
          <Text style={styles.subtitle}>Stay updated with company news</Text>
        </View>
      </View>

      {/* Enhanced Search and Filter Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search announcements..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={[styles.filterChip, filterImportant && styles.filterChipActive]}
            onPress={() => setFilterImportant(!filterImportant)}
          >
            <Text style={[styles.filterChipIcon, filterImportant && styles.filterChipIconActive]}>
              ⭐
            </Text>
            <Text style={[styles.filterChipText, filterImportant && styles.filterChipTextActive]}>
              Important
            </Text>
          </TouchableOpacity>

          <View style={styles.resultsInfo}>
            <Text style={styles.resultCount}>
              {filteredAnnouncements.length} {filteredAnnouncements.length === 1 ? 'announcement' : 'announcements'}
            </Text>
            {(searchQuery || filterImportant) && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearSearch}>
                <Text style={styles.clearFiltersText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Enhanced Create Button */}
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
        disabled={loading}
      >
        <View style={styles.createButtonIcon}>
          <Text style={styles.createButtonIconText}>+</Text>
        </View>
        <Text style={styles.createButtonText}>Create Announcement</Text>
      </TouchableOpacity>

      {/* Enhanced Announcements List */}
      {loading && announcements.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAnnouncements}
          keyExtractor={(item) => item.id}
          style={styles.list}
          refreshing={loading}
          onRefresh={fetchAnnouncements}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[
              styles.announcementCard,
              item.isPinned && styles.pinnedCard,
              item.isImportant && styles.importantCard
            ]}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.authorSection}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {item.author.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.authorName}>{item.author}</Text>
                    <Text style={styles.postDate}>{item.date}</Text>
                  </View>
                </View>
                
                <View style={styles.badgeContainer}>
                  {item.isPinned && (
                    <View style={[styles.badge, styles.pinnedBadge]}>
                      <Text style={styles.badgeText}>📌 Pinned</Text>
                    </View>
                  )}
                  {item.isImportant && (
                    <View style={[styles.badge, styles.importantBadge]}>
                      <Text style={styles.badgeText}>⭐ Important</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Card Content */}
              <Text style={styles.announcementTitle}>{item.title}</Text>
              <Text style={styles.announcementContent}>{item.content}</Text>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.reactionButton}
                  onPress={() => toggleReaction(item.id)}
                >
                  <Text style={[
                    styles.reactionIcon,
                    item.user_has_reacted && styles.reactionIconActive
                  ]}>
                    {item.user_has_reacted ? '❤️' : '🤍'}
                  </Text>
                  <Text style={styles.reactionCount}>{item.reaction_count}</Text>
                </TouchableOpacity>

                {user?.id === item.author_id && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.pinAction]}
                      onPress={() => togglePin(item.id, item.isPinned || false)}
                    >
                      <Text style={styles.actionButtonText}>
                        {item.isPinned ? 'Unpin' : 'Pin'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editAction]}
                      onPress={() => openEditModal(item)}
                    >
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteAction]}
                      onPress={() => deleteAnnouncement(item.id, item.author_id)}
                    >
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>📢</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || filterImportant 
                  ? 'No announcements found'
                  : 'No announcements yet'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery || filterImportant
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to share an announcement!'}
              </Text>
            </View>
          }
        />
      )}

      {/* Enhanced Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter announcement title"
                value={newAnnouncement.title}
                onChangeText={(text) => setNewAnnouncement(prev => ({ ...prev, title: text }))}
                editable={!loading}
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={[styles.input, styles.contentInput]}
                placeholder="Write your announcement here..."
                value={newAnnouncement.content}
                onChangeText={(text) => setNewAnnouncement(prev => ({ ...prev, content: text }))}
                multiline
                numberOfLines={6}
                editable={!loading}
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>

            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={styles.toggleItem}
                onPress={() => setNewAnnouncement(prev => ({ ...prev, isImportant: !prev.isImportant }))}
                disabled={loading}
              >
                <View style={[
                  styles.toggleCheckbox,
                  newAnnouncement.isImportant && styles.toggleCheckboxActive
                ]}>
                  {newAnnouncement.isImportant && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.toggleContent}>
                  <Text style={styles.toggleLabel}>Mark as important</Text>
                  <Text style={styles.toggleDescription}>Highlight this announcement for everyone</Text>
                </View>
                <Text style={styles.toggleIcon}>⭐</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleItem}
                onPress={() => setNewAnnouncement(prev => ({ ...prev, isPinned: !prev.isPinned }))}
                disabled={loading}
              >
                <View style={[
                  styles.toggleCheckbox,
                  newAnnouncement.isPinned && styles.toggleCheckboxActive
                ]}>
                  {newAnnouncement.isPinned && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.toggleContent}>
                  <Text style={styles.toggleLabel}>Pin to top</Text>
                  <Text style={styles.toggleDescription}>Keep this announcement at the top</Text>
                </View>
                <Text style={styles.toggleIcon}>📌</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={closeModal}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!newAnnouncement.title.trim() || !newAnnouncement.content.trim() || loading) && styles.buttonDisabled
                ]}
                onPress={editingAnnouncement ? updateAnnouncement : postAnnouncement}
                disabled={!newAnnouncement.title.trim() || !newAnnouncement.content.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingAnnouncement ? 'Update' : 'Post'} Announcement
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    minHeight: 140,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#007AFF',
  },
  headerContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#64748b',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  filterChipIconActive: {
    color: 'white',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    margin: 20,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createButtonIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 20,
  },
  announcementCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  pinnedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    backgroundColor: '#FFFEF7',
  },
  importantCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    color: '#64748b',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pinnedBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  importantBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 24,
  },
  announcementContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reactionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  reactionIconActive: {
    color: '#dc2626',
  },
  reactionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pinAction: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  editAction: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  deleteAction: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#1e293b',
  },
  contentInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  toggleGroup: {
    marginBottom: 30,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleCheckboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  toggleIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})