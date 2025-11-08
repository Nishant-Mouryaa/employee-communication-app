// hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  loading: true 
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AuthProvider initializing...')

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
        }
        
        console.log('Initial session:', initialSession)
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        
        if (initialSession?.user) {
          await ensureUserProfile(initialSession.user)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.email)
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (event === 'SIGNED_IN' && currentSession?.user) {
          await ensureUserProfile(currentSession.user)
        }
        
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      console.log('AuthProvider cleaning up...')
      subscription.unsubscribe()
    }
  }, [])

  // Function to ensure user has a profile
  const ensureUserProfile = async (user: User) => {
    try {
      console.log('Ensuring profile for user:', user.id)
      
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist or we get an error, create one
      if (fetchError || !existingProfile) {
        console.log('Creating new profile for user...')
        
        const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              username: username,
              full_name: user.user_metadata?.full_name || '',
              department: user.user_metadata?.department || '',
              position: user.user_metadata?.position || '',
              avatar_url: null,
              updated_at: new Date().toISOString(),
            }
          ])

        if (insertError) {
          console.error('Error creating user profile:', insertError)
        } else {
          console.log('Profile created successfully')
        }
      } else {
        console.log('Profile already exists')
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  const value = {
    user,
    session,
    loading
  }

  console.log('AuthProvider rendering - user:', user?.email, 'loading:', loading)

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}