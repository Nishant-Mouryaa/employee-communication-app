// screens/AnnouncementsScreen.tsx
import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  Linking,
  Platform 
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Category, Attachment, Announcement, UserRole } from '../types/announcement'

// Role-based permissions
const ROLES: { [key: string]: UserRole } = {
  employee: { canPost: false, canEditAll: false, canPin: false, canDeleteAll: false, isAdmin: false },
  manager: { canPost: true, canEditAll: false, canPin: true, canDeleteAll: false, isAdmin: false },
  admin: { canPost: true, canEditAll: true, canPin: true, canDeleteAll: true, isAdmin: true }
}

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isModalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterImportant, setFilterImportant] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    isImportant: false,
    isPinned: false,
    category_id: ''
  })
  const [attachments, setAttachments] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<UserRole>(ROLES.employee)

  useEffect(() => {
    fetchAnnouncements()
    fetchCategories()
    setupRealtimeSubscription()
    checkUserRole()
  }, [])

  useEffect(() => {
    filterAnnouncements()
  }, [announcements, searchQuery, filterImportant, selectedCategory])

const checkUserRole = async () => {
  if (!user) {
    console.log('No user found, setting default employee role')
    setUserRole(ROLES.employee)
    return
  }

  try {
    console.log('Checking role for user:', user.id)
    
    // Fetch role from profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      // Fallback to employee role
      setUserRole(ROLES.employee)
      return
    }

    console.log('Profile role:', profile?.role)

    // Set role based on profile data
    switch (profile?.role) {
      case 'admin':
        setUserRole(ROLES.admin)
        console.log('User role set to: admin')
        break
      case 'manager':
        setUserRole(ROLES.manager)
        console.log('User role set to: manager')
        break
      default:
        setUserRole(ROLES.employee)
        console.log('User role set to: employee')
    }
  } catch (error) {
    console.error('Error in checkUserRole:', error)
    setUserRole(ROLES.employee)
  }
}
  

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

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

    if (selectedCategory) {
      filtered = filtered.filter(item => item.category_id === selectedCategory)
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
          ),
          categories:category_id (
            id,
            name,
            color,
            icon
          ),
          attachments:announcement_attachments(*),
          announcement_reads!left(
            id,
            read_at
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const announcementsWithDetails = await Promise.all(
          data.map(async (item) => {
            // Fetch reactions
            const { data: reactions, error: reactionsError } = await supabase
              .from('announcement_reactions')
              .select('*')
              .eq('announcement_id', item.id)

            // Check if user has read the announcement
            const { data: readReceipt } = await supabase
              .from('announcement_reads')
              .select('*')
              .eq('announcement_id', item.id)
              .eq('user_id', user?.id)
              .single()

            // Get read count
            const { count: readCount } = await supabase
              .from('announcement_reads')
              .select('*', { count: 'exact', head: true })
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
              category_id: item.category_id,
              has_attachments: item.has_attachments,
              categories: item.categories,
              attachments: item.attachments || [],
              reactions: reactions || [],
              reaction_count: reactions?.length || 0,
              user_has_reacted: userHasReacted,
              read_receipts: item.announcement_reads,
              is_read: !!readReceipt,
              read_count: readCount || 0
            }
          })
        )

        setAnnouncements(announcementsWithDetails)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_reads'
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

  const markAsRead = async (announcementId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user.id,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'announcement_id,user_id'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const uploadAttachments = async (announcementId: string, files: File[]) => {
    setUploading(true)
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('announcement-attachments')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('announcement-attachments')
          .getPublicUrl(fileName)

        const { error: dbError } = await supabase
          .from('announcement_attachments')
          .insert({
            announcement_id: announcementId,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user?.id
          })

        if (dbError) throw dbError
      }

      // Update announcement to mark it has attachments
      await supabase
        .from('announcements')
        .update({ has_attachments: true })
        .eq('id', announcementId)

    } catch (error) {
      console.error('Error uploading attachments:', error)
      throw error
    } finally {
      setUploading(false)
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

    if (!userRole.canPost) {
      Alert.alert('Error', 'You do not have permission to post announcements')
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
            is_pinned: newAnnouncement.isPinned,
            category_id: newAnnouncement.category_id || null
          }
        ])
        .select()

      if (error) throw error

      if (data && data[0]) {
        // Upload attachments if any
        if (attachments.length > 0) {
          await uploadAttachments(data[0].id, attachments)
        }

        setNewAnnouncement({ title: '', content: '', isImportant: false, isPinned: false, category_id: '' })
        setAttachments([])
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

    if (!userRole.canEditAll && user?.id !== editingAnnouncement.author_id) {
      Alert.alert('Error', 'You can only edit your own announcements')
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
          category_id: newAnnouncement.category_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAnnouncement.id)

      if (error) throw error

      Alert.alert('Success', 'Announcement updated successfully!')
      setEditingAnnouncement(null)
      setNewAnnouncement({ title: '', content: '', isImportant: false, isPinned: false, category_id: '' })
      setAttachments([])
      setModalVisible(false)
    } catch (error) {
      console.error('Error updating announcement:', error)
      Alert.alert('Error', 'Failed to update announcement')
    } finally {
      setLoading(false)
    }
  }

  const deleteAnnouncement = async (announcementId: string, authorId: string) => {
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
              setLoading(true)
              
              // Delete related records first
              await supabase
                .from('announcement_reactions')
                .delete()
                .eq('announcement_id', announcementId)

              await supabase
                .from('announcement_reads')
                .delete()
                .eq('announcement_id', announcementId)

              await supabase
                .from('announcement_attachments')
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
    // First check if the user already has a reaction
    const { data: existingReaction, error: checkError } = await supabase
      .from('announcement_reactions')
      .select('id')
      .eq('announcement_id', announcementId)
      .eq('user_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw checkError
    }

    if (existingReaction) {
      // User has already reacted, so remove the reaction
      const { error: deleteError } = await supabase
        .from('announcement_reactions')
        .delete()
        .eq('announcement_id', announcementId)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError
    } else {
      // User hasn't reacted, so add a reaction
      const { error: insertError } = await supabase
        .from('announcement_reactions')
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
          reaction_type: 'like'
        })

      if (insertError) throw insertError
    }
  } catch (error: any) {
    console.error('Error toggling reaction:', error)
    
    // Handle specific error cases
    if (error.code === '23505') {
      // This shouldn't happen with our check, but handle it gracefully
      console.log('Duplicate reaction detected, refreshing data...')
      fetchAnnouncements() // Refresh to sync state
    } else {
      Alert.alert('Error', 'Failed to update reaction')
    }
  }
}

  const togglePin = async (announcementId: string, currentPinStatus: boolean) => {
    if (!userRole.canPin) {
      Alert.alert('Error', 'You do not have permission to pin announcements')
      return
    }

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
      isPinned: announcement.isPinned || false,
      category_id: announcement.category_id || ''
    })
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setEditingAnnouncement(null)
    setNewAnnouncement({ title: '', content: '', isImportant: false, isPinned: false, category_id: '' })
    setAttachments([])
  }

  const clearSearch = () => {
    setSearchQuery('')
    setFilterImportant(false)
    setSelectedCategory('')
  }

  const handleAttachmentPress = async (attachment: Attachment) => {
    try {
      const supported = await Linking.canOpenURL(attachment.file_url)
      if (supported) {
        await Linking.openURL(attachment.file_url)
      } else {
        Alert.alert('Error', 'Cannot open this file type')
      }
    } catch (error) {
      console.error('Error opening attachment:', error)
      Alert.alert('Error', 'Failed to open attachment')
    }
  }

  const renderAttachment = (attachment: Attachment) => (
    <TouchableOpacity
      key={attachment.id}
      style={styles.attachmentItem}
      onPress={() => handleAttachmentPress(attachment)}
    >
      <Text style={styles.attachmentIcon}>📎</Text>
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentName} numberOfLines={1}>
          {attachment.file_name}
        </Text>
        <Text style={styles.attachmentSize}>
          {(attachment.file_size / 1024).toFixed(1)} KB
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderCategoryChip = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryChip,
        selectedCategory === category.id && styles.categoryChipActive,
        { borderColor: category.color }
      ]}
      onPress={() => setSelectedCategory(
        selectedCategory === category.id ? '' : category.id
      )}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text style={[
        styles.categoryText,
        selectedCategory === category.id && styles.categoryTextActive
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  )

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
        
        {/* Categories Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map(renderCategoryChip)}
        </ScrollView>

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
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearSearch}>
                <Text style={styles.clearFiltersText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Enhanced Create Button - Only show if user has permission */}
      {userRole.canPost && (
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
      )}

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
            <TouchableOpacity
              style={[
                styles.announcementCard,
                item.isPinned && styles.pinnedCard,
                item.isImportant && styles.importantCard,
                !item.is_read && styles.unreadCard
              ]}
              onPress={() => markAsRead(item.id)}
              activeOpacity={0.7}
            >
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
                  {!item.is_read && (
                    <View style={[styles.badge, styles.unreadBadge]}>
                      <Text style={styles.badgeText}>NEW</Text>
                    </View>
                  )}
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
                  {item.categories && (
                    <View style={[
                      styles.badge, 
                      styles.categoryBadge,
                      { backgroundColor: item.categories.color + '20' }
                    ]}>
                      <Text style={[styles.badgeText, { color: item.categories.color }]}>
                        {item.categories.icon} {item.categories.name}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Card Content */}
              <Text style={styles.announcementTitle}>{item.title}</Text>
              <Text style={styles.announcementContent}>{item.content}</Text>

              {/* Attachments */}
              {item.attachments && item.attachments.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  <Text style={styles.attachmentsTitle}>Attachments:</Text>
                  {item.attachments.map(renderAttachment)}
                </View>
              )}

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.footerLeft}>
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

                  <View style={styles.readStats}>
                    <Text style={styles.readStatsText}>👁️ {item.read_count || 0}</Text>
                  </View>
                </View>

                {(userRole.canEditAll || user?.id === item.author_id) && (
                  <View style={styles.actionButtons}>
                    {userRole.canPin && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.pinAction]}
                        onPress={() => togglePin(item.id, item.isPinned || false)}
                      >
                        <Text style={styles.actionButtonText}>
                          {item.isPinned ? 'Unpin' : 'Pin'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
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
            </TouchableOpacity>
          )}
          ListEmptyComponent={
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
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter announcement title"
                value={newAnnouncement.title}
                onChangeText={(text) => setNewAnnouncement(prev => ({ ...prev, title: text }))}
                editable={!loading}
                maxLength={100}
              />
              <Text style={styles.charCount}>
                {newAnnouncement.title.length}/100
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Content *</Text>
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
              <Text style={styles.charCount}>
                {newAnnouncement.content.length}/1000
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelection}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      newAnnouncement.category_id === category.id && styles.categoryOptionActive,
                      { borderColor: category.color }
                    ]}
                    onPress={() => setNewAnnouncement(prev => ({ 
                      ...prev, 
                      category_id: prev.category_id === category.id ? '' : category.id 
                    }))}
                  >
                    <Text style={styles.categoryOptionIcon}>{category.icon}</Text>
                    <Text style={[
                      styles.categoryOptionText,
                      newAnnouncement.category_id === category.id && styles.categoryOptionTextActive
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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

              {userRole.canPin && (
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
              )}
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
  categoriesContainer: {
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#007AFF10',
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#007AFF',
    fontWeight: '600',
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
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#F0F9FF',
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
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
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
  categoryBadge: {
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  unreadBadgeText: {
    color: 'white',
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
  attachmentsContainer: {
    marginBottom: 16,
  },
  attachmentsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  attachmentIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
    color: '#64748b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  readStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readStatsText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
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
  charCount: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  categorySelection: {
    flexDirection: 'row',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
  },
  categoryOptionActive: {
    backgroundColor: '#007AFF10',
  },
  categoryOptionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  categoryOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
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