import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS, RADIUS } from '../theme/colors';

interface Props {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoSnackbar({ message, onUndo, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, []);

  const handleUndo = () => {
    Animated.timing(translateY, {
      toValue: 80,
      duration: 180,
      useNativeDriver: true,
    }).start(onUndo);
  };

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: 80,
      duration: 180,
      useNativeDriver: true,
    }).start(onDismiss);
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <Text style={styles.message} numberOfLines={1}>{message}</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleUndo} style={styles.undoBtn} hitSlop={8}>
          <Text style={styles.undoText}>되돌리기</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss} hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e2d48',
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  undoBtn: {
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  undoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  closeText: {
    fontSize: 13,
    color: COLORS.faint,
  },
});
