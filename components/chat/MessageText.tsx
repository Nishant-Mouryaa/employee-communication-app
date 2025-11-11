// components/chat/MessageText.tsx
import React from 'react'
import { Text, StyleSheet } from 'react-native'

interface MessageTextProps {
  content: string
  style?: any
}

export const MessageText: React.FC<MessageTextProps> = ({ content, style }) => {
  // Split text by mentions
  const parts = content.split(/(@\w+)/g)
  
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          return (
            <Text key={index} style={styles.mention}>
              {part}
            </Text>
          )
        }
        return <Text key={index}>{part}</Text>
      })}
    </Text>
  )
}

const styles = StyleSheet.create({
  mention: {
    color: '#6366F1',
    fontWeight: '600',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
})