// components/announcements/AnnouncementCard.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
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

  return (
    <TouchableOpacity
      style={[
        styles.card,
        announcement.isPinned && styles.pinnedCard,
        announcement.isImportant && styles.importantCard,
        !announcement.is_read && styles.unreadCard
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.authorSection}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {announcement.author.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.authorName}>{announcement.author}</Text>
            <Text style={styles.postDate}>{announcement.date}</Text>
          </View>
        </View>
        
        <CardBadges announcement={announcement} />
      </View>

      {/* Card Content */}
      <Text style={styles.title}>{announcement.title}</Text>
      <Text style={styles.content}>{announcement.content}</Text>

      {/* Attachments */}
      {announcement.attachments && announcement.attachments.length > 0 && (
        <AttachmentList attachments={announcement.attachments} />
      )}

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <TouchableOpacity
            style={styles.reactionButton}
            onPress={onReaction}
          >
            <Text style={[
              styles.reactionIcon,
                            announcement.user_has_reacted && styles.reactionIconActive
            ]}>
              {announcement.user_has_reacted ? '❤️' : '🤍'}
            </Text>
            <Text style={styles.reactionCount}>{announcement.reaction_count}</Text>
          </TouchableOpacity>

          <View style={styles.readStats}>
            <Text style={styles.readStatsText}>👁️ {announcement.read_count || 0}</Text>
          </View>
        </View>

        {canEdit && (
          <View style={styles.actionButtons}>
            {userRole.canPin && (
              <TouchableOpacity
                style={[styles.actionButton, styles.pinAction]}
                onPress={onPin}
              >
                <Text style={styles.actionButtonText}>
                  {announcement.isPinned ? 'Unpin' : 'Pin'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.editAction]}
              onPress={onEdit}
            >
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteAction]}
              onPress={onDelete}
            >
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 24,
  },
  content: {
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
})