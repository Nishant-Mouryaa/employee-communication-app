// screens/AnnouncementsScreen.tsx (Updated with all Phase 3 features)
import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useEnhancedSearch } from '../hooks/useEnhancedSearch'
import { useCategories } from '../hooks/useCategories'
import { useUserRole } from '../hooks/useUserRole'
import { useRealtimeAnnouncements } from '../hooks/useRealtimeAnnouncements'
import { useLanguage } from '../hooks/useLanguage'
import { announcementService } from '../services/announcementService'
import { schedulingService } from '../services/schedulingService'
import { analyticsService } from '../services/analyticsService'
import { AnnouncementHeader } from '../components/announcements/AnnouncementHeader'
import { SearchBar } from '../components/announcements/SearchBar'
import { CategoryFilter } from '../components/announcements/CategoryFilter'
import { AnnouncementCard } from '../components/announcements/AnnouncementCard'
import { CreateAnnouncementModal } from '../components/announcements/CreateAnnouncementModal'
import { CommentsSection } from '../components/announcements/CommentsSection'
import { ScheduleModal } from '../components/announcements/ScheduleModal'
import { AdvancedSearchModal } from '../components/announcements/AdvancedSearchModal'
import { NotificationSettingsModal } from '../components/announcements/NotificationSettingsModal'
import { AnalyticsDashboard } from '../components/announcements/AnalyticsDashboard'
import { VersionHistoryModal } from '../components/announcements/VersionHistoryModal'
import { ExportModal } from '../components/announcements/ExportModal'
import { LanguageModal } from '../components/announcements/LanguageModal'
import { Announcement } from '../types/announcement'

export default function AnnouncementsScreen() {
  const { user } = useAuth()
  const { userRole } = useUserRole()
  const { announcements, loading, fetchAnnouncements } = useAnnouncements()
  const { categories } = useCategories()
  const { t } = useLanguage()
  const {
    filters,
    updateFilter,
    clearFilters,
    filteredAnnouncements,
    hasActiveFilters
  } = useEnhancedSearch(announcements)

  // Modal states
  const [isModalVisible, setModalVisible] = useState(false)
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false)
  const [isAdvancedSearchVisible, setAdvancedSearchVisible] = useState(false)
  const [isNotificationSettingsVisible, setNotificationSettingsVisible] = useState(false)
  const [isAnalyticsVisible, setAnalyticsVisible] = useState(false)
  const [isVersionHistoryVisible, setVersionHistoryVisible] = useState(false)
  const [isExportVisible, setExportVisible] = useState(false)
  const [isLanguageVisible, setLanguageVisible] = useState(false)

  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [versionHistoryAnnouncementId, setVersionHistoryAnnouncementId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [readStartTime, setReadStartTime] = useState<number>(0)

  useRealtimeAnnouncements(fetchAnnouncements)

  const handleMarkAsRead = async (announcementId: string) => {
    if (user) {
      const readTime = readStartTime > 0 ? Math.floor((Date.now() - readStartTime) / 1000) : 0
      await announcementService.markAsRead(announcementId, user.id)
      await analyticsService.trackView(announcementId, user.id, readTime)
    }
  }

  const handleToggleReaction = async (announcementId: string) => {
    if (!user) {
      Alert.alert(t('common.error'), 'You must be logged in to react')
      return
    }
    await announcementService.toggleReaction(announcementId, user.id)
    await analyticsService.logActivity(user.id, announcementId, 'reaction')
  }

  const handleTogglePin = async (announcementId: string, currentPinStatus: boolean) => {
    if (!userRole.canPin) {
      Alert.alert(t('common.error'), 'You do not have permission to pin announcements')
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
      Alert.alert(t('common.error'), 'You can only delete your own announcements')
      return
    }

    Alert.alert(
      t('announcements.delete'),
      t('announcements.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true)
              await announcementService.deleteAnnouncement(announcementId)
              Alert.alert(t('common.success'), 'Announcement deleted successfully')
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || 'Failed to delete announcement')
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
      Alert.alert(t('common.error'), 'You must be logged in')
      return
    }

    if (!userRole.canPost) {
      Alert.alert(t('common.error'), 'You do not have permission to post announcements')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingAnnouncement) {
        if (!userRole.canEditAll && user.id !== editingAnnouncement.author_id) {
          Alert.alert(t('common.error'), 'You can only edit your own announcements')
          return
        }
        
        await announcementService.updateAnnouncement(editingAnnouncement.id, formData)
        Alert.alert(t('common.success'), 'Announcement updated successfully!')
      } else {
        const data = await announcementService.createAnnouncement(formData, user.id)
        Alert.alert(t('common.success'), 'Announcement posted successfully!')
      }
      
      closeModal()
    } catch (error) {
      Alert.alert(t('common.error'), editingAnnouncement ? 'Failed to update announcement' : 'Failed to post announcement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSchedule = async (scheduledAt: Date, expiresAt?: Date) => {
    if (!user || !userRole.canSchedule) {
      Alert.alert(t('common.error'), 'You do not have permission to schedule announcements')
      return
    }

    Alert.alert(t('common.success'), 'Schedule feature integrated with create modal')
  }

  const handleCardPress = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setReadStartTime(Date.now())
    handleMarkAsRead(announcement.id)
  }

  const handleVersionHistory = (announcementId: string) => {
    setVersionHistoryAnnouncementId(announcementId)
    setVersionHistoryVisible(true)
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
        {hasActiveFilters
          ? t('announcements.noAnnouncements')
          : t('announcements.noAnnouncements')}
      </Text>
      <Text style={styles.emptyText}>
        {hasActiveFilters
          ? 'Try adjusting your search or filters'
          : userRole.canPost 
            ? 'Be the first to share an announcement!'
            : 'No announcements have been posted yet.'}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity
          style={styles.clearFiltersButton}
          onPress={clearFilters}
        >
          <Text style={styles.clearFiltersButtonText}>{t('common.filter')}</Text>
        </TouchableOpacity>
      )}
    </View>
  )



  return (
    <View style={styles.container}>
      <AnnouncementHeader />


      {/* Search and Filter Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <SearchBar
              searchQuery={filters.query}
              onSearchChange={(text) => updateFilter('query', text)}
              onClear={() => updateFilter('query', '')}
            />
          </View>
          
          <TouchableOpacity
            style={styles.advancedSearchButton}
            onPress={() => setAdvancedSearchVisible(true)}
          >
            <Text style={styles.advancedSearchIcon}>⚙️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setNotificationSettingsVisible(true)}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
        
        <CategoryFilter
          categories={categories}
          selectedCategory={filters.category}
          onSelectCategory={(categoryId) => updateFilter('category', categoryId)}
        />

        <View style={styles.filterSection}>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[styles.filterChip, filters.isImportant && styles.filterChipActive]}
              onPress={() => updateFilter('isImportant', filters.isImportant ? undefined : true)}
            >
              <Text style={[styles.filterChipIcon, filters.isImportant && styles.filterChipIconActive]}>
                ⭐
              </Text>
              <Text style={[styles.filterChipText, filters.isImportant && styles.filterChipTextActive]}>
                {t('announcements.important')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filters.status !== 'all' && styles.filterChipActive]}
              onPress={() => {
                const statuses = ['all', 'active', 'scheduled', 'expired']
                const currentIndex = statuses.indexOf(filters.status)
                const nextStatus = statuses[(currentIndex + 1) % statuses.length]
                updateFilter('status', nextStatus as any)
              }}
            >
              <Text style={[styles.filterChipText, filters.status !== 'all' && styles.filterChipTextActive]}>
                {filters.status === 'all' ? 'All' : 
                 filters.status === 'active' ? '✅ Active' :
                 filters.status === 'scheduled' ? '📅 Scheduled' :
                 '⏰ Expired'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.resultsInfo}>
                    <Text style={styles.resultCount}>
              {filteredAnnouncements.length} {filteredAnnouncements.length === 1 ? 'result' : 'results'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sort Options */}
        <View style={styles.sortSection}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortButtons}>
            {[
              { key: 'date', label: 'Date', icon: '📅' },
              { key: 'relevance', label: 'Relevance', icon: '🎯' },
              { key: 'reactions', label: 'Reactions', icon: '❤️' },
              { key: 'comments', label: 'Comments', icon: '💬' }
            ].map((sort) => (
              <TouchableOpacity
                key={sort.key}
                style={[
                  styles.sortButton,
                  filters.sortBy === sort.key && styles.sortButtonActive
                ]}
                onPress={() => updateFilter('sortBy', sort.key as any)}
              >
                <Text style={styles.sortButtonIcon}>{sort.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Create Button */}
      {userRole.canPost && (
        <View style={styles.createButtonContainer}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
            disabled={loading || submitting}
          >
            <View style={styles.createButtonIcon}>
              <Text style={styles.createButtonIconText}>+</Text>
            </View>
            <Text style={styles.createButtonText}>{t('announcements.create')}</Text>
          </TouchableOpacity>

          {userRole.canSchedule && (
            <TouchableOpacity
              style={styles.scheduleIconButton}
              onPress={() => setScheduleModalVisible(true)}
            >
              <Text style={styles.scheduleIconText}>📅</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Announcements List */}
      {loading && announcements.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAnnouncements}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchAnnouncements}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View>
              <AnnouncementCard
                announcement={item}
                userRole={userRole}
                userId={user?.id}
                onPress={() => handleCardPress(item)}
                onReaction={() => handleToggleReaction(item.id)}
                onPin={() => handleTogglePin(item.id, item.isPinned || false)}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id, item.author_id)}
              />
              
              {/* Version History Button */}
              {(userRole.isAdmin || user?.id === item.author_id) && (
                <TouchableOpacity
                  style={styles.versionHistoryButton}
                  onPress={() => handleVersionHistory(item.id)}
                >
                  <Text style={styles.versionHistoryIcon}>📜</Text>
                  <Text style={styles.versionHistoryText}>
                    {t('versionHistory.title')}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Show comments section if announcement is selected */}
              {selectedAnnouncement?.id === item.id && (
                <CommentsSection
                  announcementId={item.id}
                  canComment={userRole.canComment}
                />
              )}
            </View>
          )}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* All Modals */}
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

      <ScheduleModal
        visible={isScheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
        onSchedule={handleSchedule}
      />

      <AdvancedSearchModal
        visible={isAdvancedSearchVisible}
        onClose={() => setAdvancedSearchVisible(false)}
        onApply={(newFilters) => {
          Object.entries(newFilters).forEach(([key, value]) => {
            updateFilter(key as any, value)
          })
        }}
        categories={categories}
        currentFilters={filters}
      />

      <NotificationSettingsModal
        visible={isNotificationSettingsVisible}
        onClose={() => setNotificationSettingsVisible(false)}
      />

      {isAnalyticsVisible && (
        <Modal
          visible={isAnalyticsVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setAnalyticsVisible(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAnalyticsVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>
            <AnalyticsDashboard />
          </View>
        </Modal>
      )}

      <VersionHistoryModal
        visible={isVersionHistoryVisible}
        onClose={() => setVersionHistoryVisible(false)}
        announcementId={versionHistoryAnnouncementId}
        onRestore={fetchAnnouncements}
      />

 
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  actionMenu: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  actionMenuItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionMenuIcon: {
    fontSize: 16,
  },
  actionMenuText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInputWrapper: {
    flex: 1,
  },
  advancedSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  advancedSearchIcon: {
    fontSize: 18,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notificationIcon: {
    fontSize: 18,
  },
  filterSection: {
    marginTop: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sortLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortButtonIcon: {
    fontSize: 16,
  },
  createButtonContainer: {
    flexDirection: 'row',
    margin: 20,
    marginBottom: 0,
    gap: 12,
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
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
  scheduleIconButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleIconText: {
    fontSize: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  versionHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  versionHistoryIcon: {
    fontSize: 14,
  },
  versionHistoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
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
    marginBottom: 16,
  },
  clearFiltersButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  clearFiltersButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
})