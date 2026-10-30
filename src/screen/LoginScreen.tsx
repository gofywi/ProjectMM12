import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';

import {
  configureGoogleSignIn,
} from '../config/googleAuth';

import FirebaseService from '../services/FirebaseService';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
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
};

type LoginScreenNavigationProp =
  NativeStackNavigationProp<
    RootStackParamList,
    'Login'
  >;

const GoogleSignInButton = ({
  onPress,
  disabled,
  loading,
}: {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.googleButton,
        disabled &&
          styles.googleButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color="#4285F4"
          style={styles.googleIcon}
        />
      ) : (
        <MaterialCommunityIcons
          name="google"
          size={22}
          color="#4285F4"
          style={styles.googleIcon}
        />
      )}

      <Text style={styles.googleButtonText}>
        {loading
          ? 'Signing in...'
          : 'Login with Google'}
      </Text>
    </TouchableOpacity>
  );
};

const LoginScreen = ({
  navigation,
}: {
  navigation: LoginScreenNavigationProp;
}) => {
  const [isLoading, setIsLoading] =
    useState(false);

  const fadeAnim =
    useRef(
      new Animated.Value(0),
    ).current;

  const slideAnim =
    useRef(
      new Animated.Value(30),
    ).current;

  const bgFadeAnim =
    useRef(
      new Animated.Value(0),
    ).current;

  useEffect(() => {
    configureGoogleSignIn();

    checkPreviousSignIn();

    Animated.timing(
      bgFadeAnim,
      {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      },
    ).start();

    const timer =
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(
            fadeAnim,
            {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            },
          ),

          Animated.spring(
            slideAnim,
            {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            },
          ),
        ]).start();
      }, 500);

    return () =>
      clearTimeout(timer);
  }, [
    bgFadeAnim,
    fadeAnim,
    slideAnim,
  ]);

  const checkPreviousSignIn =
    async () => {

    };

  const saveUserData =
    async (
      firebaseUser: any,
    ) => {
      try {
        const firebaseToken =
          await firebaseUser.getIdToken();

        const userData = {
          id: firebaseUser.uid,

          name:
            firebaseUser.displayName ||
            '',

          email:
            firebaseUser.email ||
            '',

          photo:
            firebaseUser.photoURL ||
            '',
        };

        await AsyncStorage.setItem(
          'user',
          JSON.stringify(userData),
        );

        await AsyncStorage.setItem(
          'userToken',
          firebaseToken,
        );

        await FirebaseService
          .saveUserProfile(
            firebaseUser,
          );
      } catch (error) {
        console.error(
          'Error saving user data:',
          error,
        );
      }
    };

  const handleGoogleSignIn =
    async () => {
      if (isLoading) {
        return;
      }

      setIsLoading(true);

      try {
        await GoogleSignin
          .hasPlayServices({
            showPlayServicesUpdateDialog:
              true,
          });

        /*
         * Clear previous Google sign-in
         * selection so the account picker
         * can be shown again.
         */
        try {
          await GoogleSignin
            .signOut();
        } catch (e) {
          // Ignore if no Google session exists
        }

        const signInResult =
          await GoogleSignin
            .signIn();

        if (
          signInResult.type !==
          'success'
        ) {
          setIsLoading(false);
          return;
        }

        const googleUser =
          signInResult.data;

        if (
          !googleUser.idToken
        ) {
          throw new Error(
            'Google Sign-In did not return an ID token.',
          );
        }

        const googleCredential =
          GoogleAuthProvider
            .credential(
              googleUser.idToken,
            );

        const firebaseCredential =
          await signInWithCredential(
            getAuth(),
            googleCredential,
          );

        console.log(
          'Firebase Sign-In successful:',
          firebaseCredential
            .user.uid,
        );

        await saveUserData(
          firebaseCredential.user,
        );

        setIsLoading(false);

        /*
         * NEW FLOW
         *
         * Login
         *   ↓
         * Home
         */
        navigation.replace(
          'Home',
        );
      } catch (
        error: any
      ) {
        setIsLoading(false);

        console.error(
          'Google/Firebase Sign-In Error:',
          error,
        );

        let errorMessage =
          'Unable to sign in with Google. Please try again.';

        if (
          error.code ===
          statusCodes
            .SIGN_IN_CANCELLED
        ) {
          errorMessage =
            'Sign in was cancelled';
        } else if (
          error.code ===
          statusCodes.IN_PROGRESS
        ) {
          errorMessage =
            'Sign in is already in progress';
        } else if (
          error.code ===
          statusCodes
            .PLAY_SERVICES_NOT_AVAILABLE
        ) {
          errorMessage =
            'Google Play Services are unavailable or outdated.';
        } else if (
          error.code ===
          'auth/account-exists-with-different-credential'
        ) {
          errorMessage =
            'An account already exists with this email using another sign-in method.';
        } else if (
          error.code ===
          'auth/invalid-credential'
        ) {
          errorMessage =
            'Firebase rejected the Google credential. Check your Web Client ID and Firebase SHA fingerprints.';
        } else if (
          error.code ===
          'auth/network-request-failed'
        ) {
          errorMessage =
            'Network error. Check your internet connection and try again.';
        } else if (
          error.message
        ) {
          errorMessage =
            error.message;
        }

        Alert.alert(
          'Sign In Failed',
          errorMessage,
          [
            {
              text: 'OK',
            },
          ],
        );
      }
    };

  const handleSignOut =
    async () => {
      try {
        await GoogleSignin
          .signOut();

        await getAuth()
          .signOut();

        await AsyncStorage
          .removeItem('user');

        await AsyncStorage
          .removeItem(
            'userToken',
          );

        await AsyncStorage
          .removeItem(
            'aiMode',
          );

        console.log(
          'Signed out successfully',
        );
      } catch (error) {
        console.error(
          'Sign out error:',
          error,
        );
      }
    };

  return (
    <View
      style={styles.container}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <Animated.View
        style={[
          styles.bgContainer,
          {
            opacity:
              bgFadeAnim,
          },
        ]}
      >
        <ImageBackground
          source={require(
            '../Assets/1.jpg',
          )}
          style={styles.bgImage}
          resizeMode="cover"
        >
          <View
            style={styles.overlay}
          >
            <LinearGradient
              colors={[
                'rgba(0,0,0,0.2)',
                'rgba(0,0,0,0.6)',
                'rgba(0,0,0,0.9)',
              ]}
              style={
                StyleSheet
                  .absoluteFill
              }
            />
          </View>
        </ImageBackground>
      </Animated.View>

      <SafeAreaView
        style={styles.safeArea}
        edges={['bottom']}
      >
        <View
          style={styles.content}
        >
          <Animated.View
            style={[
              styles.bottomContent,
              {
                opacity:
                  fadeAnim,

                transform: [
                  {
                    translateY:
                      slideAnim,
                  },
                ],
              },
            ]}
          >
            <View
              style={
                styles.titleSection
              }
            >
              <Text
                style={
                  styles.appName
                }
              >
                SumzAI
              </Text>

              <Text
                style={
                  styles.tagline
                }
              >
                Your AI-powered
                document assistant
              </Text>
            </View>

            <View
              style={
                styles.buttonSection
              }
            >
              <GoogleSignInButton
                onPress={
                  handleGoogleSignIn
                }
                disabled={
                  isLoading
                }
                loading={
                  isLoading
                }
              />

              <View
                style={
                  styles.termsContainer
                }
              >
                <Icon
                  name="shield"
                  size={12}
                  color="rgba(255,255,255,0.6)"
                />

                <Text
                  style={
                    styles.termsText
                  }
                >
                  By continuing,
                  you agree to our
                  Terms of Service
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#000000',
    },

    bgContainer: {
      ...StyleSheet
        .absoluteFillObject,
    },

    bgImage: {
      flex: 1,
      justifyContent:
        'flex-end',
    },

    overlay: {
      ...StyleSheet
        .absoluteFillObject,
    },

    safeArea: {
      flex: 1,
      justifyContent:
        'flex-end',
    },

    content: {
      paddingHorizontal:
        24,

      paddingBottom:
        Platform.OS ===
        'ios'
          ? 20
          : 24,
    },

    bottomContent: {
      gap: 32,
    },

    titleSection: {
      gap: 8,
    },

    appName: {
      fontSize: 48,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: -1.5,
    },

    tagline: {
      fontSize: 16,

      color:
        'rgba(255,255,255,0.7)',

      fontWeight: '400',
      letterSpacing: -0.2,
      maxWidth: 300,
      lineHeight: 22,
    },

    buttonSection: {
      gap: 16,
    },

    googleButton: {
      backgroundColor:
        '#ffffff',

      borderRadius: 16,

      flexDirection: 'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical: 16,

      paddingHorizontal: 20,

      gap: 10,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },

    googleButtonDisabled: {
      opacity: 0.7,
    },

    googleIcon: {
      width: 22,
    },

    googleButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1a1a1a',
      letterSpacing: -0.2,
    },

    termsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 6,
    },

    termsText: {
      fontSize: 10,

      color:
        'rgba(255,255,255,0.5)',

      fontWeight: '400',
    },
  });

export default LoginScreen;