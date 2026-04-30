import { useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS } from '../theme/colors';
import { useAppStore } from '../stores/appStore';

export function useColors() {
  const theme = useAppStore((s) => s.theme);
  const system = useColorScheme(); // 'dark' | 'light' | null

  if (theme === 'system') {
    return system === 'light' ? LIGHT_COLORS : DARK_COLORS;
  }
  return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}
