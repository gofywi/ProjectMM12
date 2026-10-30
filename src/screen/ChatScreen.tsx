import React, { useState, useEffect, useRef } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  StatusBar,
  Animated,
  Alert,
  Clipboard,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import LlamaService from '../services/LlamaService';
import DatabaseService, { ChatSession, ChatMessage } from '../services/DatabaseService';
import DocumentService from '../services/DocumentService';
import UploadingModal from '../components/UplodingModal';
import PMMessageOptions from '../components/PMMessageOptions';
import { useTheme } from '../utils/ThemeSwitcher';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.82;

type RootStackParamList = {
  Home: undefined;
  Chat: { documentText?: string; documentName?: string } | undefined;
  Memory: undefined;
  Settings: undefined;
};

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

const TypingIndicator = () => {
  const { theme } = useTheme();
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];
    const animate = (dot: Animated.Value, delay: number) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );
      anim.start();
      animations.push(anim);
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
    return () => { animations.forEach(anim => anim.stop()); };
  }, [dot1, dot2, dot3]);

  const translateYDot = (dot: Animated.Value) =>
    dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <View style={styles.typingBubble}>
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.primaryLight, transform: [{ translateY: translateYDot(dot1) }] }]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.primaryCyan, transform: [{ translateY: translateYDot(dot2) }] }]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.primaryBlue, transform: [{ translateY: translateYDot(dot3) }] }]} />
    </View>
  );
};

const AnimatedMessage = ({ children }: { children: React.ReactNode }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 9,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const indexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDisplayedText('');
    setCursorVisible(true);
    indexRef.current = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.substring(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 25);

    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(cursorInterval);
    };
  }, [text]);

  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={[styles.processingText, { color: theme.textSecondary }]}>
        {displayedText}
      </Text>
      {cursorVisible && (
        <View style={[styles.cursor, { backgroundColor: theme.primaryLight }]} />
      )}
    </View>
  );
};

const DocumentProcessingLinear = () => {
  const [state, setState] = useState<'typing' | 'reading' | 'analyzing' | 'preparing' | 'HangOn'>('typing');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [state, fadeAnim]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const advance = () => {
      setState(prev => {
        switch (prev) {
          case 'typing': return 'reading';
          case 'reading': return 'analyzing';
          case 'analyzing': return 'preparing';
          case 'preparing': return 'HangOn';
          default: return 'HangOn';
        }
      });
    };

    if (state === 'typing') timeout = setTimeout(advance, 1000);
    else if (state === 'reading') timeout = setTimeout(advance, 15000);
    else if (state === 'analyzing') timeout = setTimeout(advance, 10000);
    else if (state === 'preparing') timeout = setTimeout(advance, 10000);
    else timeout = setTimeout(advance, 20000);

    return () => clearTimeout(timeout);
  }, [state]);

  const getStateText = () => {
    switch (state) {
      case 'reading': return 'Reading document…';
      case 'analyzing': return 'Analyzing content…';
      case 'preparing': return 'Preparing answer…';
      case 'HangOn': return 'Almost there…';
      default: return '';
    }
  };

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {state === 'typing' ? <TypingIndicator /> : <TypewriterText text={getStateText()} />}
      </Animated.View>
    </View>
  );
};

const QuickActions = ({
  onSelect,
  disabled,
}: {
  onSelect: (text: string) => void;
  disabled: boolean;
}) => {
  const actions = [
    { label: 'Summarize', prompt: 'Please summarize this document.', icon: 'file-text' },
    { label: 'Key points', prompt: 'What are the key points of this document?', icon: 'list' },
    { label: 'Explain', prompt: 'Explain this document in simple terms.', icon: 'help-circle' },
  ];

  const { theme } = useTheme();
  return (
    <View style={[styles.quickActionsWrapper, { backgroundColor: theme.background }]}>
      <View style={styles.quickActionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quickActionChip, { backgroundColor: theme.surface, borderColor: theme.border }, disabled && { opacity: 0.5 }]}
            onPress={() => onSelect(action.prompt)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon name={action.icon} size={18} color={theme.primaryLight} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const ChatScreen = ({ navigation, route }: { navigation: ChatScreenNavigationProp; route: ChatScreenRouteProp }) => {
  const { theme, isDark } = useTheme();
  const documentTextRef = useRef<string | null>(route.params?.documentText ?? null);
  const [documentName, setDocumentName] = useState<string | null>(route.params?.documentName ?? null);
  const documentTextStateRef = useRef<string | null>(route.params?.documentText ?? null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState('');

  const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef<FlatList>(null);

  const hasSentFirstDocMessage = useRef(false);
  const isFirstDocMessage = useRef(false);

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUploadButton, setShowUploadButton] = useState(false);
  const [showChatInterface, setShowChatInterface] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeModel();

    createPulse(pulseAnim1, 0);
    createPulse(pulseAnim2, 1300);
    createPulse(pulseAnim3, 2600);
  }, []);

  const createPulse = (anim: Animated.Value, delay: number) => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1.4,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const initializeModel = async () => {
    try {
      setIsModelLoading(true);
      setModelError(null);

      await LlamaService.initialize();

      try {
        await DatabaseService.initialize();
      } catch (dbErr) {
        console.error('Database init failed (non-fatal):', dbErr);
      }

      const hasDocument = !!documentTextRef.current;
      const welcomeText = hasDocument
        ? `I've loaded "${documentName}". What would you like to know?`
        : '';

      const welcomeMessage: Message = {
        id: 'welcome',
        text: welcomeText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(hasDocument ? [welcomeMessage] : []);
      setShowQuickActions(hasDocument);
      setShowUploadButton(!hasDocument);
      setShowChatInterface(hasDocument);
      setIsModelLoading(false);
    } catch (error) {
      console.error('Initialization error:', error);
      setModelError('Failed to load AI model. Please restart the app.');
      setIsModelLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    });
    return () => keyboardDidShowListener.remove();
  }, []);

  const handleUploadPress = async () => {
    try {
      const document = await DocumentService.pickDocument();
      if (!document) return;

      setUploadingFileName(document.name);
      setIsUploading(true);

      const rawText = await DocumentService.extractTextFromDocument(document.uri, document.type);
      const { text: contextText, wasTruncated } = DocumentService.truncateForContext(rawText);

      if (wasTruncated) {
        console.log('[ChatScreen] Document truncated');
      }

      setIsUploading(false);

      documentTextRef.current = contextText;
      documentTextStateRef.current = contextText;
      setDocumentName(document.name);
      setShowUploadButton(false);
      setShowQuickActions(true);
      setShowChatInterface(true);

      const welcomeMessage: Message = {
        id: 'welcome',
        text: `I've loaded "${document.name}". What would you like to know?`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      hasSentFirstDocMessage.current = false;

    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Error', err.message || 'Upload failed', [{ text: 'OK' }]);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text ?? inputText;
    if (!messageText.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!text) setInputText('');
    setIsGenerating(true);

    if (!hasSentFirstDocMessage.current) {
      setShowQuickActions(false);
    }

    if (documentTextRef.current && !hasSentFirstDocMessage.current) {
      isFirstDocMessage.current = true;
    } else {
      isFirstDocMessage.current = false;
    }

    try {
      let sessionId = currentSessionId;
      if (!sessionId) {
        const title = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;
        sessionId = await DatabaseService.createSession(title, documentName || undefined);
        setCurrentSessionId(sessionId);
      }

      await DatabaseService.saveMessage(sessionId, 'user', messageText, userMessage.timestamp);

      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      if (documentTextRef.current) {
        conversationHistory.push({
          role: 'user' as const,
          content: `Here is a document I need help with:\n\n---\n${documentTextRef.current}\n---`,
        });
        conversationHistory.push({
          role: 'assistant' as const,
          content: `I've read the document. I'm ready to answer your questions.`,
        });
      }

      const priorMessages = messages
        .filter(msg => msg.id !== 'welcome')
        .map(msg => ({
          role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.text,
        }));
      conversationHistory.push(...priorMessages);

      conversationHistory.push({ role: 'user' as const, content: messageText });

      const aiMessageId = (Date.now() + 1).toString();
      const aiTimestamp = new Date();

      setMessages(prev => [
        ...prev,
        { id: aiMessageId, text: '', sender: 'ai', timestamp: aiTimestamp },
      ]);

      const finalResponse = await LlamaService.generateResponseStream(
        conversationHistory,
        (token: string) => {
          setMessages(prev =>
            prev.map(msg => (msg.id === aiMessageId ? { ...msg, text: msg.text + token } : msg))
          );
        },
      );

      await DatabaseService.saveMessage(sessionId, 'assistant', finalResponse, aiTimestamp);

      if (isFirstDocMessage.current) {
        hasSentFirstDocMessage.current = true;
      }
    } catch (error) {
      console.error('Response generation error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: 'Something went wrong. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      isFirstDocMessage.current = false;
    }
  };

  const handleNewChat = () => {
    documentTextRef.current = null;
    documentTextStateRef.current = null;
    setDocumentName(null);
    hasSentFirstDocMessage.current = false;
    setShowQuickActions(false);
    setShowUploadButton(true);
    setShowChatInterface(false);
    setMessages([]);
    setCurrentSessionId(null);
  };

  const handleLongPressAI = (message: Message) => {
    setSelectedMessage(message);
    setMessageOptionsVisible(true);
  };

  const handleCopyMessage = () => {
    if (selectedMessage?.text) {
      Clipboard.setString(selectedMessage.text);
    }
  };

  const handleReportMessage = () => {
    Keyboard.dismiss();
    setTimeout(() => {
      Alert.alert(
        'Report Message',
        'Are you sure you want to report this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Report',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Reported', 'Thank you for your feedback. We will review this message.');
            }
          },
        ],
        { cancelable: true }
      );
    }, 300);
  };

  const openDrawer = async () => {
    setDrawerOpen(true);
    setLoadingSessions(true);
    try {
      const s = await DatabaseService.getAllSessions();
      setSessions(s);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setLoadingSessions(false);
    }
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, tension: 180, friction: 20, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const loadSession = async (session: ChatSession) => {
    closeDrawer();
    try {
      const dbMessages: ChatMessage[] = await DatabaseService.getMessages(session.id);
      const restored: Message[] = dbMessages.map(m => ({
        id: m.id.toString(),
        text: m.content,
        sender: m.role === 'user' ? 'user' : 'ai',
        timestamp: new Date(m.timestamp),
      }));

      if (session.document_name) {
        documentTextRef.current = null;
        documentTextStateRef.current = null;
        setDocumentName(session.document_name);
        hasSentFirstDocMessage.current = true;
        setShowQuickActions(false);
        setShowUploadButton(false);
        setShowChatInterface(true);
      } else {
        documentTextRef.current = null;
        documentTextStateRef.current = null;
        setDocumentName(null);
        hasSentFirstDocMessage.current = false;
        setShowQuickActions(false);
        setShowUploadButton(true);
        setShowChatInterface(false);
      }

      setMessages(restored.length > 0 ? restored : []);
      setCurrentSessionId(session.id);
    } catch (e) {
      console.error('Failed to load session:', e);
    }
  };

  const deleteSessionFromDB = (id: number) => {
    Alert.alert('Delete chat', 'Remove this chat from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await DatabaseService.deleteSession(id);
          setSessions(prev => prev.filter(s => s.id !== id));
          if (currentSessionId === id) handleNewChat();
        },
      },
    ]);
  };

  const renderAIBubble = (children: React.ReactNode) => (
    <LinearGradient
      colors={
        isDark
          ? ['rgba(30,41,59,0.96)', 'rgba(37,99,235,0.12)', 'rgba(124,58,237,0.18)']
          : ['#FFFFFF', 'rgba(99,102,241,0.06)', 'rgba(139,92,246,0.08)']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.bubble, styles.bubbleLeft, styles.aiBubble, { borderColor: isDark ? 'rgba(96,165,250,0.20)' : theme.border }]}
    >
      {children}
    </LinearGradient>
  );

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.sender === 'user';
    const isLastMessage = index === messages.length - 1;

    if (!isUser && item.text === '' && isGenerating && isLastMessage) {
      return (
        <AnimatedMessage>
          <View style={[styles.row, styles.rowLeft]}>
            {renderAIBubble(
              isFirstDocMessage.current ? <DocumentProcessingLinear /> : <TypingIndicator />
            )}
          </View>
        </AnimatedMessage>
      );
    }

    if (isUser) {
      return (
        <AnimatedMessage>
          <View style={[styles.row, styles.rowRight]}>
            <LinearGradient
              colors={['#2563EB', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleRight, styles.userBubble]}
            >
              <Text style={styles.userMessageText}>{item.text}</Text>
            </LinearGradient>
          </View>
        </AnimatedMessage>
      );
    }

    return (
      <AnimatedMessage>
        <TouchableOpacity
          onLongPress={() => handleLongPressAI(item)}
          delayLongPress={400}
          activeOpacity={0.9}
        >
          <View style={[styles.row, styles.rowLeft]}>
            {renderAIBubble(<Text style={[styles.aiMessageText, { color: theme.messageAIText }]}>{item.text}</Text>)}
          </View>
        </TouchableOpacity>
      </AnimatedMessage>
    );
  };

  const UploadButton = () => (
    <TouchableOpacity
      style={styles.uploadButtonContainer}
      onPress={handleUploadPress}
      activeOpacity={0.95}
    >
      <LinearGradient
        colors={['#e90e0eff', '#2563EB', '#de3aedff', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.circle, styles.circle1, { transform: [{ scale: pulseAnim1 }] }]} />
      <Animated.View style={[styles.circle, styles.circle2, { transform: [{ scale: pulseAnim2 }] }]} />
      <Animated.View style={[styles.circle, styles.circle3, { transform: [{ scale: pulseAnim3 }] }]} />

      <View style={styles.uploadButtonGlass} />

      <View style={styles.uploadButtonContent}>
        <View style={styles.uploadIconCircle}>
          <Icon name="upload-cloud" size={34} color="#fff" />
        </View>
        <View style={styles.uploadTextContainer}>
          <Text style={styles.uploadTitle}>Choose a Document</Text>
          <Text style={styles.uploadHint}>PDF • DOCX • TXT</Text>
        </View>
        <View style={styles.uploadArrow}>
          <Icon name="chevron-right" size={24} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <UploadingModal visible={isUploading} fileName={uploadingFileName} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={[styles.keyboardView, { backgroundColor: theme.background }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            {documentName ? (
              <View style={styles.docBadgeContainer}>
                <Icon name="file-text" size={14} color={theme.primaryLight} />
                <Text style={[styles.docBadgeText, { color: theme.primaryLight }]} numberOfLines={1}>
                  {documentName}
                </Text>
              </View>
            ) : (
              <Text style={[styles.headerTitle, { color: theme.text }]}>Welcome</Text>
            )}
          </View>

          <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={openDrawer}>
            <Icon name="menu" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {isModelLoading ? (
          <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="large" color={theme.primaryLight} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading model…</Text>
          </View>
        ) : modelError ? (
          <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
            <Icon name="alert-circle" size={48} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{modelError}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={initializeModel}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : showUploadButton ? (
          <ImageBackground
            source={isDark ? require('../Assets/4_1.jpg') : require('../Assets/bg2.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(5,8,22,0.96)', 'rgba(15,23,42,0.90)', 'rgba(30,27,75,0.92)']
                  : ['rgba(255,255,255,0.75)', 'rgba(248,250,252,0.85)', 'rgba(255,255,255,0.92)']
              }
              style={styles.backgroundOverlay}
            >
              <View style={styles.newChatContainer}>
                <Text style={[
                  styles.heroTitle,
                  { color: isDark ? '#FFFFFF' : '#0F172A' }
                ]}>
                  Ask your files anything.
                </Text>
                <Text style={[
                  styles.heroSubtitle,
                  { color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(71,85,105,0.85)' }
                ]}>
                  Upload a document and let your AI read, understand, summarize, and explain it.
                </Text>

                <View style={styles.centeredUploadContainer}>
                  <UploadButton />
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={[styles.messagesList, { backgroundColor: theme.background }]}
              showsVerticalScrollIndicator={false}
            />

            {showQuickActions && (
              <QuickActions onSelect={sendMessage} disabled={isGenerating} />
            )}

            <View style={[styles.inputWrapper, { backgroundColor: theme.background }]}>
              <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask anything…"
                  placeholderTextColor={theme.inputPlaceholder}
                  multiline
                  editable={!isGenerating}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isGenerating) && styles.sendButtonDisabled,
                  ]}
                  onPress={() => sendMessage()}
                  disabled={!inputText.trim() || isGenerating}
                >
                  <LinearGradient
                    colors={['#2563EB', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButtonGradient}
                  >
                    {isGenerating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon name="send" size={18} color="#fff" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <PMMessageOptions
        visible={messageOptionsVisible}
        onClose={() => {
          setMessageOptionsVisible(false);
          setSelectedMessage(null);
        }}
        onCopy={handleCopyMessage}
        onReport={handleReportMessage}
      />

      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
        statusBarTranslucent
      >
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
          pointerEvents="none"
        />
        <TouchableOpacity
          style={[styles.backdropTouch, { left: DRAWER_WIDTH }]}
          onPress={closeDrawer}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.drawer,
            { backgroundColor: theme.background2, borderRightColor: theme.border, transform: [{ translateX: drawerAnim }] },
          ]}
        >
          <View style={[styles.drawerHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.drawerTitle, { color: theme.text }]}>History</Text>
            <View style={styles.drawerHeaderActions}>
              <TouchableOpacity
                style={[styles.drawerIconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => { closeDrawer(); handleNewChat(); }}
              >
                <Icon name="edit-3" size={18} color={theme.primaryLight} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.drawerIconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={closeDrawer}>
                <Icon name="x" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {loadingSessions ? (
            <View style={styles.drawerCenter}>
              <ActivityIndicator color={theme.primaryLight} />
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.drawerCenter}>
              <Icon name="clock" size={32} color={theme.textTertiary} />
              <Text style={[styles.drawerEmptyText, { color: theme.textTertiary }]}>No history yet</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {sessions.map(item => {
                const isActive = item.id === currentSessionId;
                return (
                  <TouchableOpacity
                    key={item.id.toString()}
                    style={[
                      styles.sessionRow,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      isActive && styles.sessionRowActive,
                    ]}
                    onPress={() => loadSession(item)}
                    onLongPress={() => deleteSessionFromDB(item.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.sessionIconWrap, { borderColor: theme.border }]}>
                      <Icon
                        name={item.document_name ? 'file-text' : 'message-square'}
                        size={15}
                        color={isActive ? theme.primaryLight : theme.textTertiary}
                      />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: theme.textTertiary }]}>
                        {[
                          item.document_name
                            ? item.document_name.length > 20
                              ? item.document_name.substring(0, 20) + '…'
                              : item.document_name
                            : null,
                          item.message_count ? `${item.message_count} msgs` : null,
                        ].filter(Boolean).join('  ·  ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  docBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.32)',
  },
  docBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A78BFA',
    maxWidth: width * 0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    width: '100%',
    marginBottom: 12,
    flexDirection: 'row',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: width * 0.75,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 21,
  },
  aiBubble: {
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.20)',
    borderBottomLeftRadius: 7,
    overflow: 'hidden',
  },
  userBubble: {
    borderBottomRightRadius: 7,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  bubbleLeft: {},
  bubbleRight: {},
  aiMessageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#E5E7EB',
    fontWeight: '400',
  },
  userMessageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  typingContainer: {
    paddingVertical: 4,
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  typingBubbleContainer: {
    alignSelf: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 70,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  processingText: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  cursor: {
    width: 2,
    height: 16,
    marginLeft: 2,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundOverlay: {
    flex: 1,
  },
  newChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 330,
    marginBottom: 34,
  },
  centeredUploadContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonContainer: {
    width: '100%',
    maxWidth: 420,
    height: 112,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.38,
    shadowRadius: 30,
    elevation: 18,
  },
  uploadButtonGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  uploadButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  circle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.28,
  },
  circle1: {
    top: -70,
    right: -50,
    backgroundColor: '#22eedacd',
  },
  circle2: {
    bottom: -80,
    left: -40,
    backgroundColor: '#f75555ff',
  },
  circle3: {
    top: 25,
    left: -60,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fa6060ff',
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(159, 157, 157, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  uploadHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.76)',
    fontWeight: '500',
  },
  uploadArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsWrapper: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  quickActionsContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 4,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(2,6,23,0.75)',
    zIndex: 10,
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 11,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
    borderRightWidth: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  drawerHeaderActions: {
    flexDirection: 'row',
    gap: 4,
  },
  drawerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  drawerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  drawerEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
  },
  sessionRowActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.42)',
  },
  sessionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  sessionMeta: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default ChatScreen;