// hooks/useTypingAnimation.ts
import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

export const useTypingAnimation = (isTyping: boolean) => {
  const dot1Anim = useRef(new Animated.Value(0)).current
  const dot2Anim = useRef(new Animated.Value(0)).current
  const dot3Anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isTyping) {
      const createAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        )
      }

      const animation = Animated.parallel([
        createAnimation(dot1Anim, 0),
        createAnimation(dot2Anim, 150),
        createAnimation(dot3Anim, 300),
      ])

      animation.start()

      return () => animation.stop()
    }
  }, [isTyping, dot1Anim, dot2Anim, dot3Anim])

  return { dot1Anim, dot2Anim, dot3Anim }
}