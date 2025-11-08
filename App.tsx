// App.tsx
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, ActivityIndicator, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// Import our hooks and components
import { useAuth, AuthProvider } from './hooks/useAuth'
import Auth from './components/Auth'

// Import our screens
import HomeScreen from './screens/HomeScreen'
import ChatScreen from './screens/ChatScreen'
import TasksScreen from './screens/TasksScreen'
import AnnouncementsScreen from './screens/AnnouncementsScreen'
import ProfileScreen from './screens/ProfileScreen'

const Tab = createBottomTabNavigator()

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {user ? (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 0,
              elevation: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              height: Platform.OS === 'ios' ? 88 : 65,
              paddingTop: 8,
              paddingBottom: Platform.OS === 'ios' ? 28 : 8,
              marginBottom: 10,
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
              } else if (route.name === 'Profile') {
                iconName = focused ? 'person-circle' : 'person-circle-outline'
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
            component={HomeScreen}
            options={{
              tabBarLabel: 'Home',
            }}
          />
          <Tab.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{
              tabBarLabel: 'Chat',
            }}
          />
          <Tab.Screen 
            name="Tasks" 
            component={TasksScreen}
            options={{
              tabBarLabel: 'Tasks',
            }}
          />
          <Tab.Screen 
            name="Announcements" 
            component={AnnouncementsScreen}
            options={{
              tabBarLabel: 'News',
            }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{
              tabBarLabel: 'Profile',
            }}
          />
        </Tab.Navigator>
      ) : (
        <Auth />
      )}
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}