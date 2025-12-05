// components/Auth.tsx
import React, { useState, useEffect } from 'react'
import { Alert, StyleSheet, View, ScrollView, Text, TouchableOpacity } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from 'react-native-elements'
import { useRoute, RouteProp } from '@react-navigation/native'
import { acceptInvitation } from '../services/invitationService'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTenant } from '../hooks/useTenant'
const PENDING_INVITATION_KEY = 'pending_invitation'

type AuthRouteProp = RouteProp<{
  Auth: {
    mode?: 'signup' | 'login'
    invitationData?: {
      email: string
      role: string
      organizationId: string
      token: string
    }
  }
}, 'Auth'>

export default function Auth() {
  const route = useRoute<AuthRouteProp>()
  const params = route.params || {}
  
  const [email, setEmail] = useState(params.invitationData?.email || '')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [isSignUp, setIsSignUp] = useState(params.mode === 'signup')
  const [loading, setLoading] = useState(false)
  const [invitationData, setInvitationData] = useState(params.invitationData)

  useEffect(() => {
    // Load pending invitation if exists
    loadPendingInvitation()
  }, [])

  const loadPendingInvitation = async () => {
    try {
      const pending = await AsyncStorage.getItem(PENDING_INVITATION_KEY)
      if (pending && !invitationData) {
        const data = JSON.parse(pending)
        setInvitationData(data)
        setEmail(data.email)
        setIsSignUp(true)
      }
    } catch (error) {
      console.error('Error loading pending invitation:', error)
    }
  }

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    })

    if (error) {
      Alert.alert('Sign In Error', error.message)
      setLoading(false)
      return
    }

    // If there's a pending invitation, accept it
    if (invitationData && data.user) {
      try {
        await acceptInvitation(invitationData.token, data.user.id)
        await AsyncStorage.removeItem(PENDING_INVITATION_KEY)
        console.log('✅ Invitation accepted after login')
      } catch (err) {
        console.error('Error accepting invitation after login:', err)
      }
    }

    setLoading(false)
  }


async function signUpWithEmail() {
  if (!email || !password || !username || !fullName || !department || !position) {
    Alert.alert('Error', 'Please fill in all fields')
    return
  }

  if (password.length < 6) {
    Alert.alert('Error', 'Password should be at least 6 characters')
    return
  }

  if (username.length < 3) {
    Alert.alert('Error', 'Username should be at least 3 characters')
    return
  }

  setLoading(true)
  
  try {
    console.log('🔵 Starting signup process...')
    console.log('📧 Email:', email)
    console.log('👤 Username:', username)
    console.log('🎫 Has invitation:', !!invitationData)
    if (invitationData) {
      console.log('📋 Invitation role:', invitationData.role)
      console.log('🏢 Invitation org:', invitationData.organizationId)
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          full_name: fullName.trim(),
        },
      },
    })

    if (authError) {
      console.error('❌ Auth error:', authError)
      Alert.alert('Sign Up Error', authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      console.error('❌ No user data returned')
      Alert.alert('Error', 'Failed to create account')
      setLoading(false)
      return
    }

    console.log('✅ User created:', authData.user.id)

    // Wait longer for trigger to complete
    console.log('⏳ Waiting for profile creation trigger...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Build update data with explicit role
    const updateData: any = {
      department: department.trim(),
      position: position.trim(),
      role: invitationData?.role || 'employee', // Default to employee if no invitation
    }
    
    // If from invitation, add organization
    if (invitationData) {
      updateData.organization_id = invitationData.organizationId
      console.log('📝 Setting organization_id:', invitationData.organizationId)
      console.log('👔 Setting role:', invitationData.role)
    } else {
      // No invitation - this user will need to create/join an org
      // They won't be admin until they create an organization
      console.log('👔 Setting default role: employee (no invitation)')
    }

    console.log('💾 Updating profile with:', updateData)

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', authData.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Profile update error:', updateError)
      console.error('Error details:', JSON.stringify(updateError, null, 2))
      
      // Don't fail completely, but warn the user
      Alert.alert(
        'Warning',
        'Account created but profile update failed. You may need to contact support.',
        [{ text: 'OK' }]
      )
    } else {
      console.log('✅ Profile updated successfully:', updatedProfile)
    }

    // Verify the update worked
const { data: verifyProfile, error: verifyError } = await supabase
  .from('profiles')
  .select('id, role, organization_id, username')
  .eq('id', authData.user.id)
  .single()

console.log('🔍 Verification - Profile after update:', verifyProfile)

if (verifyProfile) {
  if (invitationData && verifyProfile.role !== invitationData.role) {
    console.error('⚠️ WARNING: Role mismatch!')
    console.error('Expected role:', invitationData.role)
    console.error('Actual role:', verifyProfile.role)
  }
}
    // Accept invitation if exists
    if (invitationData) {
      try {
        console.log('🎫 Accepting invitation...')
        await acceptInvitation(invitationData.token, authData.user.id)
        await AsyncStorage.removeItem(PENDING_INVITATION_KEY)
        console.log('✅ Invitation accepted')
        
        Alert.alert(
          'Success! 🎉',
          `Account created as ${invitationData.role}! You can now access your organization.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // User will be auto-redirected to MainApp
                resetForm()
              }
            }
          ]
        )
      } catch (inviteError: any) {
        console.error('❌ Invitation acceptance error:', inviteError)
        Alert.alert(
          'Warning',
          'Account created but failed to accept invitation. Please contact your administrator.'
        )
      }
    } else {
      // No invitation - regular signup
      console.log('📋 No invitation - regular signup flow')
      Alert.alert(
        'Success',
        'Account created successfully! Now set up your organization.',
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm()
            }
          }
        ]
      )
    }
  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    console.error('Error stack:', error.stack)
    Alert.alert('Error', 'An unexpected error occurred: ' + error.message)
  } finally {
    setLoading(false)
  }
}


  const resetForm = () => {
    setEmail('')
    setPassword('')
    setUsername('')
    setFullName('')
    setDepartment('')
    setPosition('')
    if (!invitationData) {
      setIsSignUp(false)
    }
  }

  const toggleAuthMode = () => {
    if (invitationData) {
      // If there's invitation data, always show the appropriate mode
      Alert.alert(
        'Note',
        'You have a pending invitation. Please complete signup or login to accept it.'
      )
      return
    }
    setIsSignUp(!isSignUp)
    if (!isSignUp) {
      setUsername('')
      setFullName('')
      setDepartment('')
      setPosition('')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Workplace</Text>
        <Text style={styles.subtitle}>
          {invitationData 
            ? `Join as ${invitationData.role}` 
            : isSignUp ? 'Create your account' : 'Sign in to your account'
          }
        </Text>
      </View>

      {invitationData && (
        <View style={styles.invitationBanner}>
          <Text style={styles.invitationText}>
            📧 You're joining with an invitation
          </Text>
          <Text style={styles.invitationEmail}>{invitationData.email}</Text>
        </View>
      )}

      <View style={styles.form}>
        {isSignUp && (
          <>
            <View style={styles.verticallySpaced}>
              <Input
                label="Username"
                leftIcon={{ type: 'font-awesome', name: 'user' }}
                onChangeText={(text) => setUsername(text)}
                value={username}
                placeholder="johndoe"
                autoCapitalize={'none'}
              />
            </View>
            <View style={styles.verticallySpaced}>
              <Input
                label="Full Name"
                leftIcon={{ type: 'font-awesome', name: 'id-card' }}
                onChangeText={(text) => setFullName(text)}
                value={fullName}
                placeholder="John Doe"
                autoCapitalize={'words'}
              />
            </View>
            <View style={styles.verticallySpaced}>
              <Input
                label="Department"
                leftIcon={{ type: 'font-awesome', name: 'building' }}
                onChangeText={(text) => setDepartment(text)}
                value={department}
                placeholder="Engineering"
              />
            </View>
            <View style={styles.verticallySpaced}>
              <Input
                label="Position"
                leftIcon={{ type: 'font-awesome', name: 'briefcase' }}
                onChangeText={(text) => setPosition(text)}
                value={position}
                placeholder="Software Engineer"
              />
            </View>
          </>
        )}

        <View style={styles.verticallySpaced}>
          <Input
            label="Email"
            leftIcon={{ type: 'font-awesome', name: 'envelope' }}
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="email@address.com"
            autoCapitalize={'none'}
            keyboardType="email-address"
            disabled={!!invitationData}
          />
        </View>
        <View style={styles.verticallySpaced}>
          <Input
            label="Password"
            leftIcon={{ type: 'font-awesome', name: 'lock' }}
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry={true}
            placeholder="Password"
            autoCapitalize={'none'}
          />
        </View>

        <View style={[styles.verticallySpaced, styles.mt20]}>
          <Button 
            title={isSignUp ? "Sign up" : "Sign in"} 
            disabled={loading} 
            onPress={isSignUp ? signUpWithEmail : signInWithEmail} 
            buttonStyle={styles.primaryButton}
          />
        </View>

        {!invitationData && (
          <View style={styles.authToggle}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={styles.toggleButton}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6366F1',
    padding: 40,
    paddingTop: 100,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  invitationBanner: {
    backgroundColor: '#e0e7ff',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  invitationText: {
    fontSize: 14,
    color: '#4338ca',
    fontWeight: '600',
    marginBottom: 4,
  },
  invitationEmail: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '700',
  },
  form: {
    padding: 20,
    marginTop: 20,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
  },
  authToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
  toggleText: {
    marginBottom: 40,
    color: '#6b7280',
    marginRight: 5,
  },
  toggleButton: {
    marginBottom: 40,
    color: '#6366F1',
    fontWeight: '600',
  },
})