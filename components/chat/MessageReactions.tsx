// components/chat/MessageReactions.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Reaction } from '../../types/chat'

interface MessageReactionsProps {
  reactions: Reaction[]
  onReactionPress: (emoji: string) => void
  currentUserId?: string
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReactionPress,
  currentUserId
}) => {
  // Group reactions by emoji
  const reactionGroups = reactions.reduce((groups, reaction) => {
    if (!groups[reaction.emoji]) {
      groups[reaction.emoji] = []
    }
    groups[reaction.emoji].push(reaction)
    return groups
  }, {} as Record<string, Reaction[]>)

  const hasReactions = Object.keys(reactionGroups).length > 0

  if (!hasReactions) return null

  return (
    <View style={styles.reactionsContainer}>
      {Object.entries(reactionGroups).map(([emoji, emojiReactions]) => {
        const hasUserReacted = emojiReactions.some(r => r.user_id === currentUserId)
        
        return (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionBubble,
              hasUserReacted && styles.userReactionBubble
            ]}
            onPress={() => onReactionPress(emoji)}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={[
              styles.reactionCount,
              hasUserReacted && styles.userReactionCount
            ]}>
              {emojiReactions.length}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  userReactionBubble: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  reactionEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  userReactionCount: {
    color: '#6366F1',
  },
})