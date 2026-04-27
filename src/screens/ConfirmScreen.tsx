import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import type { ExtractedSchedule } from './DashboardScreen';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmScreenProps {
  schedule: ExtractedSchedule;
  onConfirm: (updated: ExtractedSchedule) => void; // 등록 완료
  onDismiss: () => void;                           // 무시/닫기
}

interface EditableFields {
  title: string;
  date: string;
  time: string;
  location: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field = ({
  label,
  value,
  onChangeText,
  editable = true,
  placeholder = '',
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  placeholder?: string;
}) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.fieldInput, !editable && styles.fieldInputMuted]}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      placeholder={placeholder}
      placeholderTextColor={COLORS.faint}
      selectionColor={COLORS.accent}
    />
  </View>
);

const SourceBadge = ({ source }: { source: ExtractedSchedule['source'] }) => {
  const map: Record<string, { label: string; color: string }> = {
    kakao: { label: '카카오톡', color: '#a08000' },
    sms:   { label: 'SMS',     color: '#4488cc' },
    email: { label: '이메일',  color: '#888888' },
  };
  const { label, color } = map[source] ?? { label: source, color: '#888' };
  return <Text style={[styles.sourceBadge, { color }]}>{label} · AI 추출 (Gemini 2.5 Flash)</Text>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateFields(fields: EditableFields): string | null {
  if (!fields.title.trim()) return '제목을 입력해주세요.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) return '날짜 형식이 올바르지 않아요. (예: 2024-05-20)';
  if (!/^\d{2}:\d{2}$/.test(fields.time)) return '시간 형식이 올바르지 않아요. (예: 19:00)';
  return null;
}

async function addToGoogleCalendar(schedule: ExtractedSchedule): Promise<void> {
  /**
   * TODO: Google Calendar API 호출
   *
   * import { GoogleSignin } from '@react-native-google-signin/google-signin';
   * const tokens = await GoogleSignin.getTokens();
   *
   * const startDateTime = `${schedule.date}T${schedule.time}:00`;
   * const endDateTime   = `${schedule.date}T${addOneHour(schedule.time)}:00`;
   *
   * await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
   *   method: 'POST',
   *   headers: {
   *     Authorization: `Bearer ${tokens.accessToken}`,
   *     'Content-Type': 'application/json',
   *   },
   *   body: JSON.stringify({
   *     summary: schedule.title,
   *     location: schedule.location ?? '',
   *     start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
   *     end:   { dateTime: endDateTime,   timeZone: 'Asia/Seoul' },
   *   }),
   * });
   */
  await new Promise(r => setTimeout(r, 1200)); // placeholder delay
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConfirmScreen({
  schedule,
  onConfirm,
  onDismiss,
}: ConfirmScreenProps) {
  const [fields, setFields] = useState<EditableFields>({
    title:    schedule.title,
    date:     schedule.date,
    time:     schedule.time,
    location: schedule.location ?? '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof EditableFields) => (val: string) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const handleConfirm = async () => {
    const error = validateFields(fields);
    if (error) {
      Alert.alert('입력 확인', error);
      return;
    }

    setLoading(true);
    try {
      const updated: ExtractedSchedule = {
        ...schedule,
        title:    fields.title.trim(),
        date:     fields.date,
        time:     fields.time,
        location: fields.location.trim() || null,
        status:   'added',
      };
      await addToGoogleCalendar(updated);
      onConfirm(updated);
    } catch {
      Alert.alert('등록 실패', 'Google Calendar 등록 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    Alert.alert('무시하기', '이 일정을 무시할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '무시', style: 'destructive', onPress: onDismiss },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 반투명 배경 (탭해서 닫기) */}
        <TouchableOpacity style={styles.backdrop} onPress={handleDismiss} activeOpacity={1} />

        {/* 바텀 시트 */}
        <View style={styles.sheet}>
          {/* 핸들 */}
          <View style={styles.handle} />

          {/* 타이틀 행 */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>일정 확인 및 수정</Text>
            <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                <Path d="M4 4l10 10M14 4L4 14" stroke={COLORS.muted} strokeWidth={1.4} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* 원본 메시지 */}
          <View style={styles.rawBox}>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Rect x={1} y={1} width={10} height={10} rx={2} stroke={COLORS.faint} strokeWidth={1} />
              <Path d="M3 4h6M3 6.5h4" stroke={COLORS.faint} strokeWidth={1} strokeLinecap="round" />
            </Svg>
            <Text style={styles.rawText} numberOfLines={2}>
              "{schedule.rawMessage}"
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 제목 */}
            <Field
              label="제목"
              value={fields.title}
              onChangeText={set('title')}
              placeholder="일정 제목"
            />

            {/* 날짜 / 시간 (2열) */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="날짜"
                  value={fields.date}
                  onChangeText={set('date')}
                  placeholder="2024-05-20"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="시간"
                  value={fields.time}
                  onChangeText={set('time')}
                  placeholder="19:00"
                />
              </View>
            </View>

            {/* 장소 */}
            <Field
              label="장소"
              value={fields.location}
              onChangeText={set('location')}
              placeholder="장소 (선택)"
            />

            {/* 출처 */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>출처</Text>
              <View style={[styles.fieldInput, styles.fieldInputMuted]}>
                <SourceBadge source={schedule.source} />
              </View>
            </View>
          </ScrollView>

          {/* 액션 버튼 */}
          <View style={styles.actionWrap}>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.accent} />
              ) : (
                <View style={styles.confirmBtnInner}>
                  <CalendarIcon />
                  <Text style={styles.confirmBtnText}>Google Calendar에 등록</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.7}>
              <Text style={styles.dismissBtnText}>무시하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── CalendarIcon ─────────────────────────────────────────────────────────────

const CalendarIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Rect x={1} y={2} width={14} height={13} rx={2} stroke="#4db8ff" strokeWidth={1.2} />
    <Path d="M1 6h14M5 2v4M11 2v4" stroke="#4db8ff" strokeWidth={1.2} strokeLinecap="round" />
  </Svg>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  bg:      '#0b0f1a',
  surface: '#141c2e',
  border:  '#1e2d48',
  accent:  '#4db8ff',
  text:    '#ccdaee',
  muted:   '#556688',
  faint:   '#334466',
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0.5,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingBottom: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2a3a55',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  rawBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0f1a2e',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 14,
  },
  rawText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldWrap: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginLeft: 2,
  },
  fieldInput: {
    backgroundColor: '#0f1a2e',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#2244aa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    justifyContent: 'center',
  },
  fieldInputMuted: {
    borderColor: COLORS.border,
  },
  sourceBadge: {
    fontSize: 11,
  },
  actionWrap: {
    gap: 6,
    paddingTop: 12,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1a4a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.accent,
  },
  dismissBtn: {
    paddingVertical: 11,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 13,
    color: COLORS.muted,
  },
});