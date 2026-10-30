import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import DatabaseService, { MemoryRecord } from '../services/DatabaseService';
import { useTheme } from '../utils/ThemeSwitcher';
import { useToast } from '../components/ToastNotification';

interface MemoryScreenProps {
  navigation: { goBack: () => void };
}

// ─── helper ────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Memory Card ───────────────────────────────────────────

interface CardProps {
  memory: MemoryRecord & { parsedMetadata: { message_count: number; session_title: string } };
  theme: ReturnType<typeof useTheme>['theme'];
}

const MemoryCard = ({ memory, theme }: CardProps) => (
  <View
    style={[
      styles.card,
      {
        backgroundColor: theme.settingsCardBackground,
        borderColor: theme.settingsCardBorder,
      },
    ]}
  >
    {/* Top row: icon + session title */}
    <View style={styles.cardHeader}>
      <View style={[styles.cardIcon, { backgroundColor: theme.surface2 }]}>
        <Icon name="cpu" size={14} color={theme.primary} />
      </View>
      <Text
        style={[styles.cardTitle, { color: theme.settingsLabelColor }]}
        numberOfLines={1}
      >
        {memory.parsedMetadata.session_title}
      </Text>
    </View>

    {/* Summary snippet */}
    <Text
      style={[styles.cardSummary, { color: theme.settingsSubLabelColor }]}
      numberOfLines={3}
    >
      {memory.summary}
    </Text>

    {/* Footer: message count + date */}
    <View style={styles.cardFooter}>
      <View style={styles.pill}>
        <Icon name="message-circle" size={11} color={theme.icon} />
        <Text style={[styles.pillText, { color: theme.textTertiary }]}>
          {memory.parsedMetadata.message_count} messages
        </Text>
      </View>
      <Text style={[styles.cardDate, { color: theme.textTertiary }]}>
        {formatDate(memory.created_at)}
      </Text>
    </View>
  </View>
);

// ─── Empty State ────────────────────────────────────────────

const Empty = ({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) => (
  <View style={styles.emptyContainer}>
    <View style={[styles.emptyIcon, { backgroundColor: theme.surface2 }]}>
      <Icon name="inbox" size={28} color={theme.icon} />
    </View>
    <Text style={[styles.emptyTitle, { color: theme.text }]}>
      No memories yet
    </Text>
    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
      Memories are created automatically from your chat sessions.
    </Text>
  </View>
);

// ─── Screen ────────────────────────────────────────────────

const MemoryScreen: React.FC<MemoryScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [memories, setMemories] = useState<(MemoryRecord & { parsedMetadata: { message_count: number; session_title: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const records = await DatabaseService.getAllMemories();
      const parsed = records.map(r => ({
        ...r,
        parsedMetadata: JSON.parse(r.metadata),
      }));
      setMemories(parsed);
    } catch (e) {
      console.error('[MemoryScreen] Failed to load memories:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // ── Delete all ─────────────────────────────────────────

  const handleDeleteAll = () => {
    if (memories.length === 0) return;
    DatabaseService.deleteAllMemories()
      .then(() => {
        setMemories([]);
        toast.show({ type: 'success', message: 'All memories deleted.' });
      })
      .catch(e => {
        console.error('[MemoryScreen] Failed to delete memories:', e);
        toast.show({ type: 'error', message: 'Could not delete memories. Try again.' });
      });
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.surface2 }]}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={20} color={theme.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Memories
        </Text>

        {/* Delete all — only shown when there are memories */}
        {memories.length > 0 ? (
          <TouchableOpacity
            onPress={handleDeleteAll}
            style={[styles.deleteButton, { backgroundColor: theme.surface2 }]}
            activeOpacity={0.7}
          >
            <Icon name="trash-2" size={18} color="#E5736A" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      {/* Count badge */}
      {!loading && memories.length > 0 && (
        <View style={[styles.countBar, { borderBottomColor: theme.border }]}>
          <Icon name="cpu" size={13} color={theme.icon} />
          <Text style={[styles.countText, { color: theme.textSecondary }]}>
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'} stored
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={memories}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <MemoryCard memory={item} theme={theme} />}
        contentContainerStyle={[
          styles.listContent,
          memories.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={loading ? null : <Empty theme={theme} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────

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

  deleteButton: {
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

  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  countText: {
    fontSize: 12,
    fontWeight: '500',
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },

  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },

  cardSummary: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  pillText: {
    fontSize: 11,
    fontWeight: '500',
  },

  cardDate: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
});

export default MemoryScreen;
