// components/announcements/AnnouncementCard.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Announcement, UserRole } from '../../types/announcement'
import { AttachmentList } from './AttachmentList'
import { CardBadges } from './CardBadges'

interface AnnouncementCardProps {
  announcement: Announcement
  userRole: UserRole
  userId?: string
  onPress: () => void
  onReaction: () => void
  onPin: () => void
  onEdit: () => void
  onDelete: () => void
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  userRole,
  userId,
  onPress,
  onReaction,
  onPin,
  onEdit,
  onDelete
}) => {
  const canEdit = userRole.canEditAll || userId === announcement.author_id
  
  // Fix: Handle is_read properly - it might be undefined for new announcements
  // Only show as unread if is_read is explicitly false
  const isUnread = announcement.is_read === false
  
  // Safe data access with fallbacks
  const authorName = announcement.author || 'Unknown Author'
  const postDate = announcement.date || announcement.created_at || 'Unknown date'
  const title = announcement.title || 'No title'
  const content = announcement.content || 'No content'
  const reactionCount = announcement.reaction_count || 0
  const readCount = announcement.read_count || 0
  const commentCount = announcement.comment_count || 0
  const userHasReacted = announcement.user_has_reacted || false
  const isPinned = announcement.isPinned || false
  const isImportant = announcement.isImportant || false

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUnread && styles.unreadCard
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Unread Indicator */}
      {isUnread && <View style={styles.unreadIndicator} />}

      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.authorSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {authorName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorName}
            </Text>
            <Text style={styles.postDate}>
              {postDate}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <CardBadges 
            announcement={{
              ...announcement,
              isImportant,
              category: announcement.category
            }} 
          />
          {isPinned && (
            <Ionicons name="pin" size={16} color="#6B7280" />
          )}
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.contentSection}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.content} numberOfLines={3}>
          {content}
        </Text>
      </View>

      {/* Attachments */}
      {announcement.attachments && announcement.attachments.length > 0 && (
        <View style={styles.attachmentsSection}>
          <AttachmentList attachments={announcement.attachments} />
        </View>
      )}

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.statsSection}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={onReaction}
          >
            <Ionicons 
              name={userHasReacted ? "heart" : "heart-outline"} 
              size={16} 
              color={userHasReacted ? "#DC2626" : "#6B7280"} 
            />
            <Text style={[
              styles.statText,
              userHasReacted && styles.statTextActive
            ]}>
              {reactionCount}
            </Text>
          </TouchableOpacity>

          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>{readCount}</Text>
          </View>

          {commentCount > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
              <Text style={styles.statText}>{commentCount}</Text>
            </View>
          )}
        </View>

        {canEdit && (
          <View style={styles.actionButtons}>
            {userRole.canPin && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onPin}
              >
                <Ionicons 
                  name={isPinned ? "pin" : "pin-outline"} 
                  size={18} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
            >
              <Ionicons name="create-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
  },
  unreadCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#007AFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    minHeight: 40,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  contentSection: {
    marginBottom: 12,
    minHeight: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  attachmentsSection: {
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    minHeight: 40,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statTextActive: {
    color: '#DC2626',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
})