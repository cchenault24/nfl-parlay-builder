import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'

import { colors, fonts, typography } from '@/lib/theme/designTokens'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // No nav header. It repeated the tab's own label one line above it,
        // and its safe-area inset was being paid a second time by each
        // screen's SafeAreaView — about 78pt of empty space under the
        // Dynamic Island before any content began. Each screen carries its
        // own title in the scroll content instead.
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
        },
        tabBarActiveTintColor: colors.primaryBright,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: typography.micro.fontSize,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Build',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="american-football-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
