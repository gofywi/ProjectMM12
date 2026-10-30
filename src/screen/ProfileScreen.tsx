import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signOut } from '@react-native-firebase/auth';

import { useTheme } from '../utils/ThemeSwitcher';
import type { RootStackParamList } from '../../App';

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  photo?: string;
};

const ProfileScreen = ({
  navigation,
}: {
  navigation: ProfileScreenNavigationProp;
}) => {
  const { theme } = useTheme();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Saved by LoginScreen after Google sign-in
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          setUser(JSON.parse(stored));
          return;
        }

        // Fallback: read from the current Firebase session
        const current = getAuth().currentUser;
        if (current) {
          setUser({
            id: current.uid,
            name: current.displayName || '',
            email: current.email || '',
            photo: current.photoURL || '',
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUser();
  }, []);

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore if no Google session exists
      }

      await signOut(getAuth());

      await AsyncStorage.removeMany(['user', 'userToken', 'aiMode']);

      // Clear the stack so the user can't go back
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      Alert.alert('Logout Failed', 'Unable to sign out. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: performLogout },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        <View style={styles.backButton} />
      </View>

      {/* Profile content */}
      <View style={styles.content}>
        <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: theme.surface2 },
              ]}
            >
              <Icon name="user" size={48} color={theme.textSecondary} />
            </View>
          )}
        </View>

        <Text style={[styles.email, { color: theme.text }]}>
          {user?.email || 'No email available'}
        </Text>
      </View>

      {/* Logout */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.error }]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.85}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="log-out" size={20} color="#ffffff" />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 70,
    borderWidth: 2,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
