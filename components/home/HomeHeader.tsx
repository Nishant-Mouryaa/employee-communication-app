// components/home/HomeHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'
import { IS_MOBILE } from '../../constants/home'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

interface HomeHeaderProps {
  userEmail?: string
  onProfilePress?: () => void
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ 
  userEmail, 
  onProfilePress 
}) => {
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => supabase.auth.signOut()
        }
      ]
    )
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContent}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Smart Workplace</Text>
            <Text style={styles.subtitle}>
              {userEmail ? `Welcome, ${userEmail.split('@')[0]}!` : 'Welcome!'}
            </Text>
          </View>
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={onProfilePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="person-outline" size={22} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="log-out-outline" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
   

  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
   
    height: 50 + (IS_MOBILE ? 20 : 0),
    
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    
  },
  textContainer: {
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButton: {
      backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  signOutButton: {
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: IS_MOBILE ? 24: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: IS_MOBILE ? 15 : 15,
    color: '#333',
    fontWeight: '500',
  },
})