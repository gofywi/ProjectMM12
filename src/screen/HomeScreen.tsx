import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  StatusBar,
  ActivityIndicator,
  BackHandler,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

import UploadingModal from '../components/UplodingModal';
import { useTheme } from '../utils/ThemeSwitcher';
import ModelDownloadService from '../services/ModelDownloadService';

const { width, height } = Dimensions.get('window');

// Updated to include Login route
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Chat: { documentText?: string; documentName?: string } | undefined;
  Memory: undefined;
  Settings: undefined;
  Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const taglines = [
  { main: 'Summarize anything', sub: 'in seconds' },
  { main: '100% Private', sub: '& secure' },
  { main: 'Works completely', sub: 'offline' },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark, toggleTheme } = useTheme();

  // Model gate: checking -> downloading -> verifying -> ready (or error)
  type ModelPhase = 'checking' | 'downloading' | 'verifying' | 'ready' | 'error';
  const [modelPhase, setModelPhase] = useState<ModelPhase>('checking');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [modelError, setModelError] = useState('');

  const prepareModel = React.useCallback(async () => {
    setModelError('');
    setDownloadPercent(0);
    setModelPhase('checking');
    try {
      if ((await ModelDownloadService.check()) === 'missing') {
        setModelPhase('downloading');
        await ModelDownloadService.download(setDownloadPercent);
      }
      setModelPhase('verifying');
      if (!(await ModelDownloadService.verify())) {
        throw new Error('Model verification failed. Please try again.');
      }
      setModelPhase('ready');
    } catch (e: any) {
      console.warn('Model preparation failed:', e);
      setModelError(
        /network|request failed|unable to resolve|timed out/i.test(String(e?.message))
          ? 'Check your internet connection and try again.'
          : e?.message || 'Something went wrong. Please try again.',
      );
      setModelPhase('error');
    }
  }, []);

  useEffect(() => {
    prepareModel();
    return () => ModelDownloadService.cancel();
  }, [prepareModel]);

  // Block the hardware back button while the popup is showing.
  useEffect(() => {
    if (modelPhase === 'ready') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [modelPhase]);

  // Google profile photo saved by LoginScreen
  const [profilePhoto, setProfilePhoto] = useState<string>('');

  useEffect(() => {
    const loadProfilePhoto = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        const photo = stored ? JSON.parse(stored)?.photo : '';
        setProfilePhoto(photo || getAuth().currentUser?.photoURL || '');
      } catch (e) {
        setProfilePhoto(getAuth().currentUser?.photoURL || '');
      }
    };
    loadProfilePhoto();
  }, []);

  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0);
  const [displayText, setDisplayText] = useState({ main: '', sub: '' });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(30)).current;
  const bottomFadeAnim = useRef(new Animated.Value(0)).current;
  const themeToggleAnim = useRef(new Animated.Value(0)).current;

  // Theme toggle spin animation
  useEffect(() => {
    Animated.timing(themeToggleAnim, {
      toValue: isDark ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isDark]);

  // Initial load animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(contentSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(bottomFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

  }, []);

  // Typewriter effect
  useEffect(() => {
    let mainTimeout: NodeJS.Timeout;
    let subTimeout: NodeJS.Timeout;
    let mainIndex = 0;
    let subIndex = 0;

    const typeMain = () => {
      if (mainIndex <= taglines[currentTaglineIndex].main.length) {
        setDisplayText(prev => ({
          ...prev,
          main: taglines[currentTaglineIndex].main.slice(0, mainIndex),
        }));
        mainIndex++;
        mainTimeout = setTimeout(typeMain, 70);
      } else {
        subTimeout = setTimeout(typeSub, 150);
      }
    };

    const typeSub = () => {
      if (subIndex <= taglines[currentTaglineIndex].sub.length) {
        setDisplayText(prev => ({
          ...prev,
          sub: taglines[currentTaglineIndex].sub.slice(0, subIndex),
        }));
        subIndex++;
        subTimeout = setTimeout(typeSub, 60);
      }
    };

    typeMain();

    return () => {
      clearTimeout(mainTimeout);
      clearTimeout(subTimeout);
    };
  }, [currentTaglineIndex]);

  // Loop through taglines
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentTaglineIndex(prev => (prev + 1) % taglines.length);
        setDisplayText({ main: '', sub: '' });
        Animated.spring(fadeAnim, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }).start();
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Pulse animations for gradient circles
  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.4, duration: 4000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        ])
      ).start();
    };

    createPulse(pulseAnim1, 0);
    createPulse(pulseAnim2, 1300);
    createPulse(pulseAnim3, 2600);
  }, []);

  const handleStartPress = () => {
    navigation.navigate('Chat', {}); // Navigate without document, triggers new chat
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const iconSpin = themeToggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.fixedContainer}>
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
            <View style={styles.logoContainer}>
              <View style={styles.brandWordmark}>
                <Text style={[styles.logo, { color: theme.text }]}>sumz</Text>
                <Text style={[styles.logoAI, { color: theme.primary }]}>ai</Text>
              </View>
            </View>

            {/* Right side: theme toggle + profile */}
            <View style={styles.headerRight}>
              {/* Theme Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  {
                    backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : theme.surface2,
                    borderColor: isDark ? 'rgba(167,139,250,0.3)' : theme.border,
                  },
                ]}
                activeOpacity={0.75}
                onPress={toggleTheme}
              >
                <Animated.View style={{ transform: [{ rotate: iconSpin }] }}>
                  <Icon
                    name={isDark ? 'sun' : 'moon'}
                    size={18}
                    color={isDark ? '#A78BFA' : '#6366F1'}
                  />
                </Animated.View>
              </TouchableOpacity>

              {/* Settings Button */}
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  {
                    backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : theme.surface2,
                    borderColor: isDark ? 'rgba(167,139,250,0.3)' : theme.border,
                  },
                ]}
                activeOpacity={0.75}
                onPress={handleSettingsPress}
              >
                <Icon
                  name="settings"
                  size={18}
                  color={isDark ? '#A78BFA' : '#6366F1'}
                />
              </TouchableOpacity>

              {/* Profile Button */}
              <TouchableOpacity
                style={[
                  styles.profileButton,
                  {
                    backgroundColor: theme.surface2,
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={handleProfilePress}
              >
                {profilePhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={styles.profileImage}
                    onError={() => setProfilePhoto('')}
                  />
                ) : (
                  <MaterialIcon
                    name="person-outline"
                    size={22}
                    color={theme.icon}
                  />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Hero Section */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: contentSlideAnim }],
              },
            ]}
          >
            <View style={styles.heroContent}>
              <Text
                style={[styles.greeting, { color: theme.text }]}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                {displayText.main}
              </Text>
              <Text
                style={[styles.subGreeting, { color: theme.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {displayText.sub}
              </Text>
            </View>
          </Animated.View>

          {/* Start Button Section */}
          <View style={styles.uploadSection}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleStartPress}
              activeOpacity={0.95}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2', '#f093fb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              <Animated.View
                style={[styles.circle, styles.circle1, { transform: [{ scale: pulseAnim1 }] }]}
              />
              <Animated.View
                style={[styles.circle, styles.circle2, { transform: [{ scale: pulseAnim2 }] }]}
              />
              <Animated.View
                style={[styles.circle, styles.circle3, { transform: [{ scale: pulseAnim3 }] }]}
              />

              <View style={styles.uploadContent}>
                <View style={styles.uploadIcon}>
                  <Icon name="zap" size={24} color="#fff" />
                </View>
                <View style={styles.uploadTextContainer}>
                  <Text style={styles.uploadTitle}>Start Chat</Text>
                  <Text style={styles.uploadHint}>Upload a document to begin</Text>
                </View>
                <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Model check / download popup over a blurred Home screen */}
      {modelPhase !== 'ready' && (
        <View style={styles.modelOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={isDark ? 'dark' : 'light'}
            blurAmount={12}
            reducedTransparencyFallbackColor={theme.background}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)' }]} />
          <View style={[styles.modalCard, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            {modelPhase === 'error' ? (
              <>
                <Icon name="alert-circle" size={36} color="#EF4444" />
                <Text style={[styles.modalTitle, { color: theme.text, marginTop: 14 }]}>Download failed</Text>
                <Text style={[styles.modalDescription, { color: theme.icon }]}>{modelError}</Text>
                <TouchableOpacity style={styles.modelRetry} activeOpacity={0.8} onPress={prepareModel}>
                  <Text style={styles.modelRetryText}>Retry</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.modalIcon}>
                  <ActivityIndicator size="large" color="#6366F1" />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {modelPhase === 'checking'
                    ? 'Loading...'
                    : modelPhase === 'downloading'
                      ? 'Downloading The AI Model'
                      : 'Verifying model'}
                </Text>
                <Text style={[styles.modalDescription, { color: theme.icon }]}>
                  {modelPhase === 'checking'
                    ? 'Checking if the AI model is on your device.'
                    : modelPhase === 'downloading'
                      ? `${downloadPercent}% - one-time download.`
                      : 'Almost ready...'}
                </Text>
                {modelPhase === 'downloading' && (
                  <View style={styles.modelBarTrack}>
                    <View style={[styles.modelBarFill, { width: `${downloadPercent}%` }]} />
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modelOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelBarTrack: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    marginTop: 18,
    backgroundColor: 'rgba(99,102,241,0.2)',
    overflow: 'hidden',
  },
  modelBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  modelRetry: {
    marginTop: 18,
    paddingVertical: 11,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: '#6366F1',
  },
  modelRetryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  fixedContainer: {
    flex: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandWordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logo: {
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -1.15,
  },
  logoAI: {
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -1.15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 30,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(99,102,241,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  themeButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  heroSection: {
    paddingHorizontal: 24,
    minHeight: 180,
    justifyContent: 'center',
    marginTop: 20,
  },
  heroContent: {
    minHeight: 168,
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: -1,
    minHeight: 52,
  },
  subGreeting: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: -1,
    minHeight: 52,
  },
  uploadSection: {
    paddingHorizontal: 24,
    marginTop: 30,
    marginBottom: 20,
  },
  uploadButton: {
    width: '100%',
    height: 90,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  uploadContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.25,
  },
  circle1: {
    top: -80,
    right: -60,
    backgroundColor: '#ff6b6b',
  },
  circle2: {
    bottom: -90,
    left: -50,
    backgroundColor: '#4ecdc4',
  },
  circle3: {
    top: 30,
    left: -70,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffe66d',
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
});

export default HomeScreen;