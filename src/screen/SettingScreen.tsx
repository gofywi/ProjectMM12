import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../utils/ThemeSwitcher';
import DatabaseService from '../services/DatabaseService';
import type { RootStackParamList } from '../../App';

// Keep in sync with versionName in android/app/build.gradle
const APP_VERSION = '1.0';

// TODO: replace with your hosted privacy policy URL
const PRIVACY_POLICY_URL = 'https://example.com/privacy-policy';

type SettingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

const SettingScreen = ({
  navigation,
}: {
  navigation: SettingScreenNavigationProp;
}) => {
  const { theme, isDark } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);

  const performDeleteAllChats = async () => {
    setIsDeleting(true);
    try {
      await DatabaseService.initialize();
      await DatabaseService.deleteAllChats();
      Alert.alert('Chats Deleted', 'All your chats have been removed.');
    } catch (error) {
      console.error('Delete all chats error:', error);
      Alert.alert('Delete Failed', 'Unable to delete chats. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllChats = () => {
    Alert.alert(
      'Delete All Chats',
      'This will permanently delete all your chats. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDeleteAllChats },
      ],
    );
  };

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      Alert.alert('Error', 'Unable to open the privacy policy.');
    }
  };

  const cardStyle = {
    backgroundColor: theme.settingsCardBackground,
    borderColor: theme.settingsCardBorder,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.surface2 }]}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={20} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Delete all chats */}
        <TouchableOpacity
          style={[styles.row, styles.dangerRow]}
          activeOpacity={0.7}
          onPress={handleDeleteAllChats}
          disabled={isDeleting}
        >
          <View style={[styles.rowIcon, styles.dangerIcon]}>
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Icon name="trash-2" size={18} color="#EF4444" />
            )}
          </View>
          <View style={styles.rowLabels}>
            <Text style={[styles.rowLabel, styles.dangerText]}>
              Delete All Chats
            </Text>
            <Text style={[styles.rowSublabel, { color: theme.settingsSubLabelColor }]}>
              Permanently remove your chat history
            </Text>
          </View>
        </TouchableOpacity>

        {/* App version */}
        <View style={[styles.row, cardStyle]}>
          <View style={[styles.rowIcon, { backgroundColor: theme.surface2 }]}>
            <Icon name="info" size={18} color={theme.primary} />
          </View>
          <View style={styles.rowLabels}>
            <Text style={[styles.rowLabel, { color: theme.settingsLabelColor }]}>
              App Version
            </Text>
          </View>
          <Text style={[styles.versionText, { color: theme.settingsSubLabelColor }]}>
            v{APP_VERSION}
          </Text>
        </View>

        {/* Privacy policy */}
        <TouchableOpacity
          style={[styles.row, cardStyle]}
          activeOpacity={0.7}
          onPress={handlePrivacyPolicy}
        >
          <View style={[styles.rowIcon, { backgroundColor: theme.surface2 }]}>
            <Icon name="shield" size={18} color={theme.primary} />
          </View>
          <View style={styles.rowLabels}>
            <Text style={[styles.rowLabel, { color: theme.settingsLabelColor }]}>
              Privacy Policy
            </Text>
          </View>
          <Icon name="external-link" size={18} color={theme.icon} />
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.settingsSubLabelColor }]}>
          Made with
        </Text>
        <MaterialIcon name="favorite" size={15} color="#EF4444" />
        <Text style={[styles.footerText, { color: theme.settingsSubLabelColor }]}>
          by Astrax
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  scrollContent: {
    padding: 20,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },

  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rowLabels: { flex: 1 },

  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
  },

  rowSublabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  dangerRow: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.3)',
  },

  dangerIcon: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },

  dangerText: {
    color: '#EF4444',
  },

  versionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 18,
  },

  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default SettingScreen;