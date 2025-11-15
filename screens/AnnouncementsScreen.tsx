// screens/AnnouncementsScreen.tsx
import React, { useState } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useAnnouncementFilters } from '../hooks/useAnnouncementFilters'
import { useCategories } from '../hooks/useCategories'
import { useUserRole } from '../hooks/useUserRole'
import { useRealtimeAnnouncements } from '../hooks/useRealtimeAnnouncements'
import { announcementService } from '../services/announcementService'
import { AnnouncementHeader } from '../components/announcements/AnnouncementHeader'
import { SearchBar } from '../components/announcements/SearchBar'
import { CategoryFilter } from '../components/announcements/CategoryFilter'
import { AnnouncementCard } from '../components/announcements/AnnouncementCard'
import { CreateAnnouncementModal } from '../components/announcements/CreateAnnouncementModal'
import { Announcement } from '../types/announcement'

export default function AnnouncementsScreen() {
  const { user } = useAuth()
  const { userRole } = useUserRole()
  const { announcements, loading, fetchAnnouncements } = useAnnouncements()
  const { categories } = useCategories()
  const {
    searchQuery,
    setSearchQuery,
    filterImportant,
    setFilterImportant,
    selectedCategory,
    setSelectedCategory,
    filteredAnnouncements,
    clearFilters
  } = useAnnouncementFilters(announcements)

  const [isModalVisible, setModalVisible] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useRealtimeAnnouncements(fetchAnnouncements)

  const handleMarkAsRead = async (announcementId: string) => {
    if (user) {
      await announcementService.markAsRead(announcementId, user.id)
    }
  }

 const handleToggleReaction = async (announcementId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to react')
      return
    }
    await announcementService.toggleReaction(announcementId, user.id)
  }

  const handleTogglePin = async (announcementId: string, currentPinStatus: boolean) => {
    if (!userRole.canPin) {
      Alert.alert('Error', 'You do not have permission to pin announcements')
      return
    }
    await announcementService.togglePin(announcementId, currentPinStatus)
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setModalVisible(true)
  }

  const handleDelete = async (announcementId: string, authorId: string) => {
    if (!userRole.canDeleteAll && user?.id !== authorId) {
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
              setSubmitting(true)
              await announcementService.deleteAnnouncement(announcementId)
              Alert.alert('Success', 'Announcement deleted successfully')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete announcement')
            } finally {
              setSubmitting(false)
            }
          }
        }
      ]
    )
  }

  const handleSubmit = async (formData: any) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in')
      return
    }

    if (!userRole.canPost) {
      Alert.alert('Error', 'You do not have permission to post announcements')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingAnnouncement) {
        if (!userRole.canEditAll && user.id !== editingAnnouncement.author_id) {
          Alert.alert('Error', 'You can only edit your own announcements')
          return
        }
        
        await announcementService.updateAnnouncement(editingAnnouncement.id, formData)
        Alert.alert('Success', 'Announcement updated successfully!')
      } else {
        const data = await announcementService.createAnnouncement(formData, user.id)
        
        // Handle attachments if needed
        // if (attachments.length > 0 && data?.[0]) {
        //   await announcementService.uploadAttachments(data[0].id, attachments, user.id)
        // }
        
        Alert.alert('Success', 'Announcement posted successfully!')
      }
      
      closeModal()
    } catch (error) {
      Alert.alert('Error', editingAnnouncement ? 'Failed to update announcement' : 'Failed to post announcement')
    } finally {
      setSubmitting(false)
    }
  }

  const closeModal = () => {
    setModalVisible(false)
    setEditingAnnouncement(null)
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>📢</Text>
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery || filterImportant || selectedCategory
          ? 'No announcements found'
          : 'No announcements yet'}
      </Text>
      <Text style={styles.emptyText}>
        {searchQuery || filterImportant || selectedCategory
          ? 'Try adjusting your search or filters'
          : userRole.canPost 
            ? 'Be the first to share an announcement!'
            : 'No announcements have been posted yet.'}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <AnnouncementHeader />

      {/* Search and Filter Section */}
      <View style={styles.searchContainer}>
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
        
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

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
            {(searchQuery || filterImportant || selectedCategory) && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Create Button */}
      {userRole.canPost && (
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
          disabled={loading || submitting}
        >
          <View style={styles.createButtonIcon}>
            <Text style={styles.createButtonIconText}>+</Text>
          </View>
          <Text style={styles.createButtonText}>Create Announcement</Text>
        </TouchableOpacity>
      )}

      {/* Announcements List */}
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
            <AnnouncementCard
              announcement={item}
              userRole={userRole}
              userId={user?.id}
              onPress={() => handleMarkAsRead(item.id)}
              onReaction={() => handleToggleReaction(item.id)}
              onPin={() => handleTogglePin(item.id, item.isPinned || false)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id, item.author_id)}
            />
          )}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Create/Edit Modal */}
      <CreateAnnouncementModal
        visible={isModalVisible}
        isEditing={!!editingAnnouncement}
        categories={categories}
        userRole={userRole}
        initialData={editingAnnouncement ? {
          title: editingAnnouncement.title,
          content: editingAnnouncement.content,
          isImportant: editingAnnouncement.isImportant,
          isPinned: editingAnnouncement.isPinned || false,
          category_id: editingAnnouncement.category_id || ''
        } : undefined}
        loading={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
})