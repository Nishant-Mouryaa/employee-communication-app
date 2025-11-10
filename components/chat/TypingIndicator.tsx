// components/chat/TypingIndicator.tsx
import React from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { TypingUser } from '../../types/chat'
import { getTypingText } from '../../utils/chatHelpers'
import { useTypingAnimation } from '../../hooks/useTypingAnimation'

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  const { dot1Anim, dot2Anim, dot3Anim } = useTypingAnimation(typingUsers.length > 0)

  if (typingUsers.length === 0) return null

  return (
    <View style={styles.typingIndicatorContainer}>
      <View style={styles.typingIndicator}>
        <View style={styles.typingDots}>
          <Animated.View 
            style={[
              styles.typingDot,
              {
                opacity: dot1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1]
                }),
                transform: [{
                  translateY: dot1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4]
                  })
                }]
              }
            ]}
          />
          <Animated.View 
            style={[
              styles.typingDot,
              {
                opacity: dot2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1]
                }),
                transform: [{
                  translateY: dot2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4]
                  })
                }]
              }
            ]}
          />
          <Animated.View 
            style={[
              styles.typingDot,
              {
                opacity: dot3Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1]
                }),
                transform: [{
                  translateY: dot3Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4]
                  })
                }]
              }
            ]}
          />
        </View>
        <Text style={styles.typingText}>{getTypingText(typingUsers)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  typingIndicatorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
})