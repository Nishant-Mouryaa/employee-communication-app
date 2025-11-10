// constants/chat.ts
import { Dimensions } from 'react-native'

export const { width: SCREEN_WIDTH } = Dimensions.get('window')
export const IS_MOBILE = SCREEN_WIDTH < 768

export const DEFAULT_CHANNELS = [
  { 
    id: '11111111-1111-1111-1111-111111111111', 
    name: 'general', 
    description: 'General discussions and announcements'
  },
  { 
    id: '22222222-2222-2222-2222-222222222222', 
    name: 'random', 
    description: 'Random conversations and fun stuff'
  },
  { 
    id: '33333333-3333-3333-3333-333333333333', 
    name: 'tech', 
    description: 'Technical discussions and help'
  },
  { 
    id: '44444444-4444-4444-4444-444444444444', 
    name: 'design', 
    description: 'Design team discussions'
  }
]

export const TYPING_TIMEOUT = 3000
export const MESSAGE_MAX_LENGTH = 500
export const TYPING_DEBOUNCE = 300