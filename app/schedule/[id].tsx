import { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';
import { useCalendarSync, CalendarCancelled } from '../../src/hooks/useCalendarSync';
import { useColors } from '../../src/hooks/useColors';
import { RADIUS } from '../../src/theme/colors';
import type { AppColors } from '../../src/theme/colors';
import type { ConflictEvent } from '../../src/services/googleCalendar';
import { getAppMeta } from '../../src/utils/sourceApps';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function askConflict(conflicts: ConflictEvent[]): Promise<boolean> {
  return new Promise((resolve) => {
    const list = conflicts
      .map((c) => `• ${c.summary} (${fmtTime(c.start)}-${fmtTime(c.end)})`)
      .join('\n');
    Alert.alert(
      '시간 겹침 알림',
      `해당 시간에 이미 ${conflicts.length}개의 일정이 있습니다:\n\n${list}\n\n그래도 등록하시겠습니까?`,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: '등록', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        selectionColor={colors.accent}
      />
    </View>
  );
}

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pendingSchedules = usePendingScheduleStore((s) => s.pendingSchedules);
  const update = usePendingScheduleStore((s) => s.update);
  const { mutate: syncToCalendar, isPending } = useCalendarSync();

  const schedule = pendingSchedules.find((s) => s.id === id);

  const [title, setTitle] = useState(schedule?.title ?? '');
  const [date, setDate] = useState(schedule?.date ?? '');
  const [time, setTime] = useState(schedule?.time ?? '');
  const [location, setLocation] = useState(schedule?.location ?? '');

  if (!schedule) {
    return (
      <View style={styles.backdrop}>
        <View style={[styles.sheet, styles.center]}>
          <Text style={{ color: colors.text }}>일정을 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  const validate = (): string | null => {
    if (!title.trim()) return '제목을 입력해주세요.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '날짜 형식: YYYY-MM-DD';
    if (!/^\d{2}:\d{2}$/.test(time)) return '시간 형식: HH:mm';
    return null;
  };

  const handleSync = () => {
    const err = validate();
    if (err) return Alert.alert('입력 확인', err);

    update(id, { title, date, time, location: location || undefined });
    syncToCalendar(
      {
        schedule: { ...schedule, title, date, time, location: location || undefined },
        onConflict: askConflict,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => {
          if (e instanceof CalendarCancelled) return;
          Alert.alert('등록 실패', e.message);
        },
      }
    );
  };

  const handleSaveOnly = () => {
    const err = validate();
    if (err) return Alert.alert('입력 확인', err);
    update(id, { title, date, time, location: location || undefined });
    router.back();
  };

  const meta = getAppMeta(schedule.sourceApp);

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbWrap}
        pointerEvents="box-none"
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>일정 확인 및 수정</Text>
            <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.rawBox}>
            <View style={[styles.sourceLetter, { backgroundColor: meta.bg }]}>
              <Text style={[styles.sourceLetterText, { color: meta.fg }]}>{meta.letter}</Text>
            </View>
            <Text style={styles.rawText} numberOfLines={2}>
              "{schedule.sourceText}"
            </Text>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Field label="제목" value={title} onChangeText={setTitle} placeholder="일정 제목" colors={colors} styles={styles} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="날짜" value={date} onChangeText={setDate} placeholder="2026-04-30" colors={colors} styles={styles} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="시간" value={time} onChangeText={setTime} placeholder="19:00" colors={colors} styles={styles} />
              </View>
            </View>
            <Field label="장소 (선택)" value={location} onChangeText={setLocation} placeholder="장소" colors={colors} styles={styles} />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleSaveOnly} disabled={isPending}>
              <Text style={styles.btnSecondaryText}>수정만 저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, isPending && styles.btnDisabled]}
              onPress={handleSync}
              disabled={isPending}
            >
              {isPending
                ? <ActivityIndicator color={colors.accent} />
                : <Text style={styles.btnPrimaryText}>캘린더에 등록</Text>
              }
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    kbWrap: { justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: RADIUS.sheet,
      borderTopRightRadius: RADIUS.sheet,
      paddingHorizontal: 20,
      paddingBottom: 24,
      maxHeight: '88%',
    },
    center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerTitle: { fontSize: 16, fontWeight: '600', color: c.text },
    rawBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surfaceAlt,
      borderRadius: RADIUS.md,
      borderWidth: 0.5,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
    },
    sourceLetter: {
      width: 22,
      height: 22,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sourceLetterText: { fontSize: 12, fontWeight: '800' },
    rawText: { flex: 1, fontSize: 13, color: c.muted, fontStyle: 'italic', lineHeight: 19 },
    scrollContent: { gap: 14, paddingBottom: 12 },
    row: { flexDirection: 'row', gap: 12 },
    field: { gap: 6 },
    fieldLabel: { fontSize: 12, color: c.muted, marginLeft: 2 },
    input: {
      backgroundColor: c.surfaceAlt,
      borderRadius: RADIUS.md,
      borderWidth: 0.5,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text,
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    btnPrimary: {
      flex: 1.5,
      paddingVertical: 14,
      borderRadius: RADIUS.lg,
      backgroundColor: c.accentDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimaryText: { color: c.accent, fontWeight: '600', fontSize: 15 },
    btnSecondary: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: RADIUS.lg,
      borderWidth: 0.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnSecondaryText: { color: c.text, fontSize: 15 },
    btnDisabled: { opacity: 0.5 },
  });
}
