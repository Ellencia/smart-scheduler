import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { RADIUS } from '../theme/colors';
import type { AppColors } from '../theme/colors';

interface Props {
  message: string;
  onDismiss: () => void;
}

export function SuccessToast({ message, onDismiss }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const fadeOut = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(onDismiss);
    }, 2000);

    return () => clearTimeout(fadeOut);
  }, [onDismiss, opacity, translateY]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      </View>
      <Text style={styles.message} numberOfLines={1}>{message}</Text>
    </Animated.View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.successBg,
      borderRadius: RADIUS.lg,
      borderWidth: 0.5,
      borderColor: c.success,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },
    iconWrap: { width: 20, alignItems: 'center' },
    message: { flex: 1, fontSize: 14, color: c.success, fontWeight: '500' },
  });
}
