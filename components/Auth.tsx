// components/Auth.tsx
import React, { useState } from 'react'
import { Alert, StyleSheet, View, ScrollView, Text, TouchableOpacity } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from 'react-native-elements'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    })

    if (error) {
      Alert.alert('Sign In Error', error.message)
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
      // First, sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (authError) {
        Alert.alert('Sign Up Error', authError.message)
        setLoading(false)
        return
      }

      // If signup successful, create profile (without organization_id - will be set during org setup)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              username: username.trim().toLowerCase(),
              full_name: fullName.trim(),
              department: department.trim(),
              position: position.trim(),
              avatar_url: null,
              // organization_id will be set when user creates/joins an organization
            }
          ])

        if (profileError) {
          console.error('Profile creation error:', profileError)
          
          // Handle specific error cases
          if (profileError.code === '42501') {
            Alert.alert(
              'Setup Required', 
              'Your account was created but profile setup failed due to security policies. Please contact your administrator to set up proper database permissions.'
            )
          } else if (profileError.code === '23505') {
            Alert.alert('Error', 'Username already exists. Please choose a different one.')
          } else {
            Alert.alert('Profile Error', `Failed to create profile: ${profileError.message}`)
          }
          
          // Sign out the user since profile creation failed
          await supabase.auth.signOut()
        } else {
          Alert.alert(
            'Success', 
            'Account created successfully! Please check your email for verification.'
          )
          resetForm()
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      Alert.alert('Error', 'An unexpected error occurred')
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
    setIsSignUp(false)
  }

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp)
    // Clear additional fields when switching to sign-in
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
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </Text>
      </View>

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