// Create a new file: navigators/HomeStackNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack'
import HomeScreen from '../screens/HomeScreen'
import ProfileScreen from '../screens/ProfileScreen'
import AcceptInvitationScreen from '../screens/AcceptInvitationScreen'
import Auth from '../components/Auth'

const Stack = createStackNavigator()

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>

      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen 
        name="AcceptInvitation" 
        component={AcceptInvitationScreen}
        options={{
          headerShown: true,
          title: 'Accept Invitation',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="Auth" 
        component={Auth}
        options={{
          headerShown: true,
          title: 'Authentication',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  )
}
