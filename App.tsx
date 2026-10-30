
/**
 * App.tsx
 * Root with ThemeProvider + ToastProvider + React Navigation.
 *
 * Firebase authentication persistence:
 * - New users -> Login
 * - Already signed-in users -> Home
 * - Wait for Firebase session restoration before navigation
 */

import React, { useEffect, useState } from 'react';

import {
  StatusBar,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme as NavDarkTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  getAuth,
  onAuthStateChanged,
} from '@react-native-firebase/auth';

import {
  ThemeProvider,
  useTheme,
} from './src/utils/ThemeSwitcher';

import { ToastProvider } from './src/components/ToastNotification';

import LoginScreen from './src/screen/LoginScreen';
import HomeScreen from './src/screen/HomeScreen';
import ChatScreen from './src/screen/ChatScreen';
import MemoryScreen from './src/screen/MemoryScreen';
import SettingScreen from './src/screen/SettingScreen';
import ProfileScreen from './src/screen/ProfileScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Chat:
    | {
        documentText?: string;
        documentName?: string;
      }
    | undefined;
  Memory: undefined;
  Settings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();

  // Null means Firebase is still restoring the session.
  const [initialRoute, setInitialRoute] =
    useState<'Login' | 'Home' | null>(null);

  // Check Firebase authentication when the app starts.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      getAuth(),
      user => {
        // Set only the initial route.
        // Existing Login/Logout navigation stays unchanged.
        setInitialRoute(current =>
          current ?? (user ? 'Home' : 'Login')
        );
      },
    );

    return unsubscribe;
  }, []);

  const navTheme: NavigationTheme = {
    ...(isDark ? NavDarkTheme : DefaultTheme),

    dark: isDark,

    colors: {
      ...(isDark ? NavDarkTheme : DefaultTheme).colors,

      primary: theme.primary,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  // Show loading animation while Firebase restores session.
  if (initialRoute === null) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          translucent
          backgroundColor="transparent"
        />

        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: false,

          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            animationTypeForReplace: 'pop',
          }}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="Chat"
          component={ChatScreen}
        />

        <Stack.Screen
          name="Memory"
          component={MemoryScreen}
        />

        <Stack.Screen
          name="Settings"
          component={SettingScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <AppNavigator />
        </ToastProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;
