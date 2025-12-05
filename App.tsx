// App.tsx
import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, ActivityIndicator, Platform, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Linking from 'expo-linking'
import initI18n from './localization/i18n'
import { HomeStackNavigator } from './navigators/HomeStackNavigator'

// Import our hooks and components
import { useAuth, AuthProvider } from './hooks/useAuth'
import { TenantProvider, useTenant } from './hooks/useTenant'
import Auth from './components/Auth'

// Import our screens
import HomeScreen from './screens/HomeScreen'
import ChatScreen from './screens/ChatScreen'
import TasksScreen from './screens/TasksScreen'
import AnnouncementsScreen from './screens/AnnouncementsScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen from './screens/AdminScreen'
import OrganizationSetupScreen from './screens/OrganizationSetupScreen'
import AcceptInvitationScreen from './screens/AcceptInvitationScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

// Deep linking configuration
const prefix = Linking.createURL('/')
const linking = {
  prefixes: [prefix, 'supabaseauth://'],
  config: {
    screens: {
      Auth: 'auth',
      AcceptInvitation: 'invite',
      OrganizationSetup: 'org-setup',
      MainApp: {
        screens: {
          Home: 'home',
          Chat: 'chat',
          Tasks: 'tasks',
          Announcements: 'announcements',
          Admin: 'admin',
        },
      },
    },
  },
}

function TabNavigator() {
  const { user } = useAuth()
  const [isUserAdmin, setIsUserAdmin] = React.useState(false)
  const [checkingAdmin, setCheckingAdmin] = React.useState(true)
  const insets = useSafeAreaInsets()
  
  React.useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          setCheckingAdmin(true)
          const { isAdmin } = await import('./services/adminService')
          const admin = await isAdmin(user.id)
          setIsUserAdmin(admin)
        } catch (error) {
          console.error('Error checking admin status:', error)
          setIsUserAdmin(false)
        } finally {
          setCheckingAdmin(false)
        }
      } else {
        setCheckingAdmin(false)
      }
    }
    checkAdmin()
  }, [user])

  if (checkingAdmin) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f8f9fa' 
      }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: Platform.OS === 'ios' ? 88 : 65 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8 + insets.bottom,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home'

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline'
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline'
          } else if (route.name === 'Announcements') {
            iconName = focused ? 'megaphone' : 'megaphone-outline'
          } else if (route.name === 'Admin') {
            iconName = focused ? 'shield' : 'shield-outline'
          }

          return (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 50,
                height: 32,
                borderRadius: 16,
                backgroundColor: focused ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              }}
            >
              <Ionicons name={iconName} size={24} color={color} />
            </View>
          )
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ tabBarLabel: 'Chat' }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={TasksScreen}
        options={{ tabBarLabel: 'Tasks' }}
      />
      <Tab.Screen 
        name="Announcements" 
        component={AnnouncementsScreen}
        options={{ tabBarLabel: 'News' }}
      />
      {isUserAdmin && (
        <Tab.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{ tabBarLabel: 'Admin' }}
        />
      )}
    </Tab.Navigator>
  )
}


function AppNavigator() {
  const { user } = useAuth()
  const { organizationId, isInvitedUser, loading: tenantLoading } = useTenant()

  console.log('🔍 AppNavigator state:', { 
    hasUser: !!user, 
    hasOrg: !!organizationId,
    isInvitedUser,
    tenantLoading
  })

  // Show loading while tenant is loading
  if (tenantLoading && user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Loading organization...</Text>
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // ==========================================
        // NOT AUTHENTICATED
        // ==========================================
        <>
          <Stack.Screen 
            name="Auth" 
            component={Auth}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AcceptInvitation" 
            component={AcceptInvitationScreen}
            options={{
              headerShown: true,
              title: 'Accept Invitation',
              presentation: 'modal',
            }}
          />
        </>
      ) : !organizationId ? (
        // ==========================================
        // AUTHENTICATED BUT NO ORGANIZATION
        // Show OrganizationSetup for users without org
        // (will become admins when they create an org)
        // ==========================================
        <>
          <Stack.Screen 
            name="OrganizationSetup" 
            component={OrganizationSetupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AcceptInvitation" 
            component={AcceptInvitationScreen}
            options={{
              headerShown: true,
              title: 'Accept Invitation',
              presentation: 'modal',
            }}
          />
        </>
      ) : (
        // ==========================================
        // AUTHENTICATED WITH ORGANIZATION
        // Both invited users and admins come here
        // ==========================================
        <>
          <Stack.Screen 
            name="MainApp" 
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AcceptInvitation" 
            component={AcceptInvitationScreen}
            options={{
              headerShown: true,
              title: 'Accept Invitation',
              presentation: 'modal',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}

function AppContent() {
  const { user, loading: authLoading } = useAuth()
  const { organizationId, loading: tenantLoading } = useTenant()

  console.log('📱 AppContent render:', {
    user: user?.email,
    authLoading,
    tenantLoading,
    organizationId,
  })

  // Show loading while auth or tenant is loading
  if (authLoading || tenantLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f8f9fa' 
      }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ 
          marginTop: 16, 
          fontSize: 14, 
          color: '#64748b',
          fontWeight: '500' 
        }}>
          Loading...
        </Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer linking={linking}>
        <AppNavigator />
      </NavigationContainer>
    </>
  )
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const [i18nInitialized, setI18nInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initI18n()
        setI18nInitialized(true)
      } catch (error) {
        console.error('Failed to initialize i18n:', error)
        setInitError('Failed to initialize app')
        setI18nInitialized(true)
      }
    }

    initializeApp()
  }, [])

  if (!i18nInitialized) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ 
          marginTop: 16, 
          fontSize: 14, 
          color: '#64748b',
          fontWeight: '500' 
        }}>
          Initializing app...
        </Text>
      </View>
    )
  }

  if (initError) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20
      }}>
        <Text style={{ 
          fontSize: 18, 
          color: '#ef4444',
          fontWeight: 'bold',
          marginBottom: 8
        }}>
          ⚠️ Initialization Warning
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: '#64748b',
          textAlign: 'center'
        }}>
          {initError}
        </Text>
      </View>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TenantProvider>
          <AppInitializer>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
              <AppContent />
            </SafeAreaView>
          </AppInitializer>
        </TenantProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}