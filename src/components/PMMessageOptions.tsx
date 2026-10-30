import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../utils/ThemeSwitcher';

interface PMMessageOptionsProps {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onReport: () => void;
}

const PMMessageOptions: React.FC<PMMessageOptionsProps> = ({
  visible,
  onClose,
  onCopy,
  onReport,
}) => {
  const { theme, isDark } = useTheme();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      // Reset to start values
      backdropOpacity.setValue(0);
      slideAnim.setValue(400);
      scaleAnim.setValue(0.85);

      // Open animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    // Close animation with fade
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          { 
            opacity: backdropOpacity,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouch}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Bottom Sheet Container */}
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'transparent',
            shadowColor: isDark ? '#000' : '#000',
            shadowOpacity: isDark ? 0.4 : 0.1,
            transform: [
              { translateY: slideAnim },
              { scaleX: scaleAnim },
              { scaleY: scaleAnim },
            ],
          },
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.handleContainer}>
          <View style={[
            styles.handle,
            { backgroundColor: isDark ? '#475569' : '#E5E5EA' }
          ]} />
        </View>

        {/* Copy Option */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            onCopy();
            handleClose();
          }}
          activeOpacity={0.6}
        >
          <Icon 
            name="copy" 
            size={20} 
            color={isDark ? '#818CF8' : '#6366F1'} 
          />
          <Text style={[
            styles.optionText,
            { color: isDark ? '#F1F5F9' : '#1C1C1E' }
          ]}>
            Copy
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={[
          styles.divider,
          { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#E5E5EA' }
        ]} />

        {/* Report Option */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            onReport();
            handleClose();
          }}
          activeOpacity={0.6}
        >
          <Icon 
            name="flag" 
            size={20} 
            color={isDark ? '#FB7185' : '#EF4444'} 
          />
          <Text style={[
            styles.optionText,
            { color: isDark ? '#FB7185' : '#EF4444' }
          ]}>
            Report
          </Text>
        </TouchableOpacity>

        {/* Safe Area Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  backdropTouch: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    borderRadius: 20,
    zIndex: 101,
    paddingBottom: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.4,
  },
  divider: {
    height: 0.5,
    marginHorizontal: 20,
    marginLeft: 54,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 34 : 16,
  },
});

export default PMMessageOptions;