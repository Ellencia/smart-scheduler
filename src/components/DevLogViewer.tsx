import { useEffect, useMemo, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '../hooks/useColors';
import { RADIUS } from '../theme/colors';
import { getDevLogs, clearDevLogs, formatDevLogs, type LogEntry } from '../utils/devLog';
import type { AppColors } from '../theme/colors';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${mo}/${day} ${hh}:${mm}:${ss}`;
}

function levelColor(level: LogEntry['level'], c: AppColors): string {
  if (level === 'error') return c.danger ?? '#ff4d4d';
  if (level === 'warn') return c.faint;
  return c.success;
}

type LogFilter = 'all' | 'warn' | 'error';

const FILTERS: { value: LogFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'warn', label: '경고' },
  { value: 'error', label: '에러' },
];

export function DevLogViewer() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filter, setFilter] = useState<LogFilter>('all');

  const filteredLogs = useMemo(
    () => logs.filter((entry) => filter === 'all' || entry.level === filter),
    [logs, filter]
  );

  const load = async () => {
    setLoading(true);
    setLogs(await getDevLogs());
    setLoading(false);
  };

  const handleClear = async () => {
    await clearDevLogs();
    setLogs([]);
  };

  const handleCopy = async () => {
    const latest = await getDevLogs();
    setLogs(latest);
    if (latest.length === 0) {
      Alert.alert('복사할 로그 없음', '기록된 로그가 없습니다.');
      return;
    }
    await Clipboard.setStringAsync(formatDevLogs(latest));
    Alert.alert('복사 완료', `${latest.length}개의 로그를 클립보드에 복사했습니다.`);
  };

  useEffect(() => {
    if (expanded) load();
  }, [expanded]);

  useEffect(() => {
    if (!expanded || !autoRefresh) return undefined;
    const timer = setInterval(() => {
      getDevLogs().then(setLogs).catch(() => {});
    }, 2500);
    return () => clearInterval(timer);
  }, [expanded, autoRefresh]);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="terminal-outline" size={18} color={colors.accent} />
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle}>NotificationTask 로그</Text>
          <Text style={styles.headerSub}>최근 {logs.length > 0 ? `${logs.length}개` : '—'}</Text>
        </View>
        {expanded && (
          <>
            <TouchableOpacity onPress={load} hitSlop={8} style={styles.clearBtn}>
              <Ionicons name="refresh" size={13} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAutoRefresh((v) => !v)}
              hitSlop={8}
              style={[styles.clearBtn, autoRefresh && styles.activeBtn]}
            >
              <Ionicons
                name="sync"
                size={13}
                color={autoRefresh ? colors.accent : colors.faint}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCopy} hitSlop={8} style={styles.clearBtn}>
              <Ionicons name="copy-outline" size={13} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
              <Text style={styles.clearText}>지우기</Text>
            </TouchableOpacity>
          </>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.faint}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.logBox}>
          <View style={styles.filterRow}>
            {FILTERS.map((item) => {
              const active = filter === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.filterBtn, active && styles.filterBtnActive]}
                  onPress={() => setFilter(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ padding: 16 }} />
          ) : filteredLogs.length === 0 ? (
            <Text style={styles.emptyText}>기록된 로그가 없습니다</Text>
          ) : (
            <ScrollView style={styles.scroll} nestedScrollEnabled>
              {filteredLogs.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: levelColor(entry.level, colors) }]} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowMsg}>{entry.msg}</Text>
                    {entry.detail && Object.keys(entry.detail).length > 0 && (
                      <Text style={styles.rowDetail}>
                        {Object.entries(entry.detail)
                          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                          .join('  ')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.rowTime}>{formatTime(entry.ts)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 0.5,
      borderColor: c.border,
      marginBottom: 8,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBody: { flex: 1, gap: 3 },
    headerTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    headerSub: { fontSize: 12, color: c.muted },
    clearBtn: {
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
    },
    activeBtn: { backgroundColor: c.accentDim },
    clearText: { fontSize: 12, color: c.faint },

    logBox: {
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: c.border,
    },
    filterBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surfaceAlt,
    },
    filterBtnActive: { backgroundColor: c.accentDim },
    filterText: { fontSize: 12, color: c.muted, fontWeight: '600' },
    filterTextActive: { color: c.accent },
    scroll: { maxHeight: 320 },
    emptyText: {
      fontSize: 13,
      color: c.faint,
      textAlign: 'center',
      paddingVertical: 20,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: c.border,
      gap: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 5,
      flexShrink: 0,
    },
    rowBody: { flex: 1, gap: 2 },
    rowMsg: { fontSize: 12, color: c.text, fontFamily: 'monospace' },
    rowDetail: { fontSize: 11, color: c.muted, fontFamily: 'monospace' },
    rowTime: { fontSize: 10, color: c.faint, marginTop: 3, flexShrink: 0 },
  });
}
