import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_LOG_KEY = 'dev-logs';
const MAX_ENTRIES = 200;

export interface LogEntry {
  id: string;
  ts: number;
  level: 'info' | 'warn' | 'error';
  tag: string;
  msg: string;
  detail?: Record<string, unknown>;
}

export async function devLog(
  tag: string,
  msg: string,
  detail?: Record<string, unknown>,
  level: LogEntry['level'] = 'info'
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DEV_LOG_KEY);
    const entries: LogEntry[] = raw ? JSON.parse(raw) : [];
    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      level,
      tag,
      msg,
      detail,
    };
    const updated = [entry, ...entries].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(DEV_LOG_KEY, JSON.stringify(updated));
  } catch {
    // 로깅 실패가 앱 동작을 방해하지 않도록 무시
  }
}

export async function getDevLogs(): Promise<LogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(DEV_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearDevLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEV_LOG_KEY);
  } catch {
    // ignore
  }
}
