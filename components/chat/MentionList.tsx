// components/chat/MentionList.tsx
import React from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native'
import { Profile } from '../../types/chat'
import { getUserInitials } from '../../utils/chatHelpers'

interface MentionListProps {
  members: Profile[]
  onSelectMention: (member: Profile) => void
  searchQuery: string
}

export const MentionList: React.FC<MentionListProps> = ({
  members,
  onSelectMention,
  searchQuery
}) => {
  // Filter out invalid members and then filter by search query
  const validMembers = members.filter(member => 
    member && (member.username || member.full_name)
  )
  
  const filteredMembers = validMembers.filter(member => {
    const query = (searchQuery || '').toLowerCase()
    const username = (member.username || '').toLowerCase()
    const fullName = (member.full_name || '').toLowerCase()
    return username.includes(query) || fullName.includes(query)
  })

  // Limit to 5 suggestions
  const suggestions = filteredMembers.slice(0, 5)

  if (suggestions.length === 0) return null

  return (
    <View style={styles.container}>
      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => {
          // Prefer id, fallback to username, then index
          return item.id || `user-${item.username || index}`
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.mentionItem}
            onPress={() => onSelectMention(item)}
          >
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {getUserInitials(item.full_name || item.username || '?')}
                </Text>
              </View>
            )}
            <View style={styles.mentionInfo}>
              <Text style={styles.mentionName}>
                {item.full_name || item.username || 'Unknown User'}
              </Text>
              <Text style={styles.mentionUsername}>
                @{item.username || 'unknown'}
              </Text>
            </View>
            {item.is_online && <View style={styles.onlineIndicator} />}
          </TouchableOpacity>
        )}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mentionInfo: {
    flex: 1,
  },
  mentionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  mentionUsername: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
})