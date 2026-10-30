import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface UploadingModalProps {
  visible: boolean;
  fileName: string;
}

const UploadingModal: React.FC<UploadingModalProps> = ({ visible, fileName }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Pulse animation for the icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Progress bar animation - continuous loading effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      progressAnim.setValue(0);
    }
  }, [visible, pulseAnim, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Pulsing document icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Icon name="file-text" size={28} color="#fff" />
          </Animated.View>

          {/* File name */}
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
            {fileName}
          </Text>

          {/* Uploading text */}
          <Text style={styles.uploadingText}>Uploading document...</Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    maxWidth: '90%',
    textAlign: 'center',
  },
  uploadingText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#6366f1',
  },
});

export default UploadingModal;