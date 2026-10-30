/**
 * ToastNotification.tsx
 *
 * Global in-app toast system.
 *
 * Setup (App.tsx):
 *   <ToastProvider>
 *     <YourApp />
 *   </ToastProvider>
 *
 * Usage (any component):
 *   const toast = useToast();
 *   toast.show({ type: 'success', message: 'Done!' });
 *   toast.show({ type: 'error',   message: 'Something went wrong.' });
 */

import React, {
  createContext,
  forwardRef,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// ─── Public types ───────────────────────────────────────────

export type ToastType = 'success' | 'error';

export interface ToastOptions {
  type: ToastType;
  message: string;
  /** Duration in ms before auto-dismiss. Default 3000. */
  duration?: number;
}

export interface ToastHandle {
  show: (opts: ToastOptions) => void;
}

// ─── Config ─────────────────────────────────────────────────

const SLIDE_OFFSET    = -90;
const SLIDE_IN_MS     = 320;
const SLIDE_OUT_MS    = 240;
const SWIPE_THRESHOLD = 60;

const VARIANTS: Record<ToastType, { bg: string; border: string; icon: string; iconColor: string }> = {
  success: {
    bg:        'rgba(12, 143, 56, 1)',
    border:    '#1b4a2eff',
    icon:      'check-circle',
    iconColor: '#94ffbaff',
  },
  error: {
    bg:        'rgba(48, 18, 18, 0.97)',
    border:    '#d91818ff',
    icon:      'x-circle',
    iconColor: '#f87171',
  },
};

// ─── Visual component (internal) ───────────────────────────

const ToastVisual = forwardRef<ToastHandle>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ToastOptions>({ type: 'success', message: '' });

  const translateY = useRef(new Animated.Value(SLIDE_OFFSET)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = (swipeDir?: 'left' | 'right') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const targetX = swipeDir === 'left' ? -400 : swipeDir === 'right' ? 400 : 0;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: swipeDir ? 0 : SLIDE_OFFSET,
        duration: SLIDE_OUT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: targetX,
        duration: SLIDE_OUT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: SLIDE_OUT_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      translateX.setValue(0);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 5,
      onPanResponderMove: (_, { dx }) => {
        translateX.setValue(dx);
        opacity.setValue(1 - Math.min(Math.abs(dx) / 200, 0.6));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.6) {
          dismiss(dx < 0 ? 'left' : 'right');
        } else {
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  useImperativeHandle(ref, () => ({
    show(newOpts: ToastOptions) {
      if (timerRef.current) clearTimeout(timerRef.current);

      setOpts(newOpts);
      setVisible(true);
      translateY.setValue(SLIDE_OFFSET);
      translateX.setValue(0);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: SLIDE_IN_MS,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => dismiss(), newOpts.duration ?? 3000);
    },
  }));

  const v = VARIANTS[opts.type];

  return (
    // Using a Modal gives the toast its own native window layer on Android,
    // so it always renders above every other Modal (drawers, dialogs, etc.)
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.toast,
          {
            backgroundColor: v.bg,
            borderColor: v.border,
            opacity,
            transform: [{ translateY }, { translateX }],
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${v.iconColor}18` }]}>
          <Icon name={v.icon} size={18} color={v.iconColor} />
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {opts.message}
        </Text>
      </Animated.View>
    </Modal>
  );
});

ToastVisual.displayName = 'ToastVisual';

// ─── Context ────────────────────────────────────────────────

const ToastContext = createContext<ToastHandle>({
  show: () => {},
});

// ─── Provider (mount once in App.tsx) ──────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<ToastHandle>(null);

  const handle: ToastHandle = {
    show: (opts) => ref.current?.show(opts),
  };

  return (
    <ToastContext.Provider value={handle}>
      {children}
      {/* Rendered at root — floats above ALL screens, modals, drawers */}
      <ToastVisual ref={ref} />
    </ToastContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────────

export const useToast = () => useContext(ToastContext);

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 20,
    zIndex: 9999,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 19,
  },
});
