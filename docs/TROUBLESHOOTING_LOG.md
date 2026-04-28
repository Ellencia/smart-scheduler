# Smart Scheduler — 빌드 트러블슈팅 & 수정 이력

> Expo SDK 55 + React Native 0.83 + react-native-android-notification-listener 환경에서 EAS Build로 Android 개발용 APK를 빌드하기까지의 전 과정 기록.

---

## 프로젝트 개요

- **목적**: 안드로이드 알림(SMS, 카카오톡 등)을 백그라운드에서 감지 → Gemini API로 일정 추출 → Google Calendar 자동 등록
- **스택**: Expo SDK 55, React Native 0.83.6, React 19, TypeScript, Expo Router, Zustand, TanStack Query
- **핵심 네이티브 모듈**: `react-native-android-notification-listener@5.0.1` (Headless JS 방식)
- **빌드 방식**: EAS Build (Expo Go로는 불가능 — 네이티브 모듈 때문)

---

## 1. 환경 세팅 단계 오류

### 1-1. `eas credentials` — buildType 값 오류
```
"build.production.android.buildType" must be one of [apk, app-bundle]
```
**원인**: `eas.json`에 `"buildType": "aab"`로 적었음
**해결**: `"app-bundle"`로 변경

### 1-2. `npx expo config` 실패
```
Failed to resolve plugin for module "expo-router"
Do you have node modules installed?
```
**원인**: `npm install` 안 함
**해결**: 먼저 `npm install` 실행

### 1-3. 패키지 버전 미존재
```
No matching version found for react-native-android-notification-listener@^2.1.0
```
**원인**: 임의로 적은 버전이 npm에 없음
**해결**: `npm show <package> versions`로 실제 최신 버전 확인 → `^5.0.1`로 수정

### 1-4. `app.json` plugins에 잘못된 등록
```
Unable to resolve a valid config plugin for react-native-android-notification-listener
No "app.plugin.js" file found
```
**원인**: 해당 라이브러리는 Expo config plugin을 **지원하지 않음**. 자동 링킹만 되는 라이브러리는 `plugins` 배열에 넣으면 안 됨.
**해결**: `app.json`의 `plugins`에서 제거. 단, 알림 리스너는 별도 config plugin 작성이 필요해서 나중에 직접 만듦 (4-3 항목)

### 1-5. `react-native-svg`도 같은 문제
**원인**: `react-native-svg`도 config plugin 없음. 자동 링킹으로 충분함.
**해결**: `app.json`의 `plugins`에서 제거

---

## 2. Prebuild 단계 오류

### 2-1. notification-icon.png 없음
```
ENOENT: no such file or directory, open 'assets/notification-icon.png'
```
**해결**: `app.json`의 `expo-notifications` 플러그인에서 `icon`, `sounds` 옵션 제거 → 문자열로 단순화 (`"expo-notifications"`)

### 2-2. EAS 업로드 시 디스크 공간 부족
```
ENOSPC: no space left on device
copyfile 'C:\Programming\git\Bunkr_Down\downloads\...' 
```
**원인**: `C:\Programming` 전체가 git 저장소라서 EAS가 부모 폴더의 모든 파일을 업로드하려 함.
**해결**: `smart-scheduler` 폴더 안에서 `git init` 실행해 독립 저장소로 분리.

---

## 3. EAS Build 빌드 서버 오류

### 3-1. `expo-dev-client` 호환성 오류
```
Plugin [id: 'expo-module-gradle-plugin'] was not found
Could not get unknown property 'release' for SoftwareComponent
```
**원인**: `npm install expo-dev-client`로 설치하면 최신 버전이 들어와서 Expo SDK와 안 맞음.
**교훈**: **Expo 패키지는 항상 `npx expo install`로 설치할 것** (SDK 호환 버전 자동 선택).
**해결**: `npx expo upgrade` → SDK 전체를 최신(55.x)으로 업그레이드.

### 3-2. `npm ci` 실패 (peer dependency 충돌)
```
peer dependency conflict: @types/react@^19.x required, found 18.x
```
**원인**: `@types/react@~18.3.12`가 Devdep에 박혀 있는데 React 19 환경.
**해결**:
1. `@types/react`를 `~19.2.0`으로 업데이트
2. `.npmrc` 파일에 `legacy-peer-deps=true` 추가 (EAS 서버의 `npm ci`에서 충돌 무시)

### 3-3. AndroidManifest 머저 충돌 — `allowBackup`
```
Attribute application@allowBackup value=(true) from AndroidManifest.xml
is also present at [:react-native-android-notification-listener]
AndroidManifest.xml value=(false)
```
**원인**: 라이브러리는 `false`, 우리 앱은 `true`로 선언 → 머저 시 충돌
**해결**: `<manifest>`에 `xmlns:tools` 네임스페이스 추가 + `<application>`에 `tools:replace="android:allowBackup"` 추가

### 3-4. 수동 매니페스트 수정의 휘발성 문제 (가장 중요)
**증상**: 로컬에서 `AndroidManifest.xml`을 수정해도 EAS 빌드 시 사라짐.
**원인**: EAS 빌드 서버가 소스를 받아서 **서버에서 다시 `expo prebuild` 실행** → `android/` 폴더 통째로 재생성 → 수동 수정이 모두 날아감.
**해결**: Expo **config plugin**을 직접 작성 (`plugins/withNotificationListener.js`).
이 플러그인은 prebuild 시점에 실행되어 매니페스트를 프로그래밍 방식으로 수정 → 어디서 빌드하든 일관성 유지.

### 3-5. Android 12+ exported 속성 미지정
```
android:exported needs to be explicitly specified for element <service>
```
**원인**: `intent-filter`가 있는 컴포넌트는 Android 12+에서 `android:exported` 명시 필수
**해결**: config plugin에 `'android:exported': 'false'` 추가 (NotificationListenerService는 시스템에서만 호출되므로 false)

### 3-6. 아이콘 파일 규격 오류
**원인**: `adaptive-icon.png`가 실제로는 JPG에 3840×2160 와이드 이미지
**해결**: 1024×1024 정사각형 진짜 PNG로 교체

---

## 4. 런타임 오류 (앱 설치 후 크래시)

### 4-1. Headless JS 등록 방식 오류
**증상**: 알림이 와도 아무 일도 일어나지 않음
**원인**: `react-native-android-notification-listener`는 **React Native의 Headless JS**를 사용. `expo-task-manager`의 `TaskManager.defineTask()`와는 완전히 다른 시스템.
**해결**:
- `notificationTask.ts`에서 `TaskManager.defineTask` 제거 → 순수 함수로 변경
- 프로젝트 진입점 `index.js` 새로 만들어서 `AppRegistry.registerHeadlessTask`로 등록
- `package.json`의 `"main"`을 `"expo-router/entry"`에서 `"./index.js"`로 변경
- `index.js`에서 expo-router를 마지막에 import

```js
// index.js
import { AppRegistry } from 'react-native';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import notificationTask from './src/background/notificationTask';
import 'expo-router/entry';

AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => notificationTask
);
```

### 4-2. ClassNotFoundException — 잘못된 서비스 클래스 이름
**증상**: 알림 권한을 부여하자마자 앱 크래시
**원인**: config plugin에 적은 클래스 이름이 실제 라이브러리의 클래스와 다름
- ❌ `com.supersami.notificationlistener.NotificationService` (가상의 이름)
- ✅ `com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener` (실제 이름)

**확인 방법**: `node_modules/react-native-android-notification-listener/android/src/main/java/` 아래 실제 패키지 경로 확인
**해결**: config plugin의 서비스 이름 수정

### 4-3. `useGoogleAuth` Hook 위치 오류
**증상**: 모듈 로드 시 "hooks can only be called inside a function component" 크래시
**원인**: `AuthSession.useAutoDiscovery(...)`를 모듈 최상단에서 호출
**해결**: hook을 `useGoogleAuth` 함수 내부로 이동

### 4-4. OAuth `responseType` 누락
**원인**: 기본값은 Authorization Code Flow지만 `settings.tsx`는 `response.params.access_token`을 읽으려 함 → 항상 undefined
**해결**: `useAuthRequest`에 `responseType: AuthSession.ResponseType.Token` 추가 (Implicit Flow로 변경)

### 4-5. Zustand 무한 렌더 루프 (`Maximum update depth exceeded`)
**증상**: 앱 시작하자마자 무한 리렌더
**원인 1 — 셀렉터 없는 destructuring**:
```ts
const { confirm, markSynced } = usePendingScheduleStore();  // ❌
```
이렇게 쓰면 매 렌더마다 새 객체가 반환되어 무한 루프.

**해결 1 — 개별 셀렉터**:
```ts
const confirm = usePendingScheduleStore((s) => s.confirm);  // ✅
const markSynced = usePendingScheduleStore((s) => s.markSynced);
```

**원인 2 — 셀렉터 안에서 새 배열 생성**:
```ts
const list = usePendingScheduleStore((s) =>
  s.pendingSchedules.filter(...)  // ❌ 매번 새 배열 반환
);
```

**해결 2 — 원본만 셀렉트, 파생은 밖에서**:
```ts
const all = usePendingScheduleStore((s) => s.pendingSchedules);  // ✅
const list = all.filter(...);
```

> **Zustand 핵심 규칙**:
> - 원시값(`.length`, boolean, string)은 셀렉터 안에서 OK
> - 객체/배열 반환은 금지 (참조가 매번 바뀜)
> - 여러 값이 필요하면 개별 셀렉터로 분리하거나 `useShallow` 사용

---

## 5. 누락된 라우트 파일

`app/(tabs)/_layout.tsx`와 `app/_layout.tsx`에서 선언했지만 실제로 없던 파일들:
- `app/(tabs)/schedule.tsx` — 등록된 일정 목록
- `app/(tabs)/settings.tsx` — 알림 권한, Google 로그인
- `app/schedule/[id].tsx` — 일정 상세/수정 모달

> expo-router는 파일 시스템 기반 라우팅이라 선언된 라우트의 파일이 없으면 런타임 크래시.

---

## 6. 최종 프로젝트 구조

```
smart-scheduler/
├── index.js                      # 진입점 (Headless JS 등록 + expo-router)
├── app.json                      # plugins: expo-router, expo-secure-store, expo-notifications, withNotificationListener, expo-font
├── eas.json                      # development(apk), preview(apk), production(app-bundle)
├── package.json                  # main: "./index.js"
├── .npmrc                        # legacy-peer-deps=true
├── .env.local                    # EXPO_PUBLIC_GEMINI_API_KEY, EXPO_PUBLIC_GOOGLE_CLIENT_ID
├── tsconfig.json                 # paths: { "@/*": ["./src/*"] }
│
├── plugins/
│   └── withNotificationListener.js  # 매니페스트에 NotificationListenerService 자동 추가
│
├── app/                          # expo-router 파일 기반 라우팅
│   ├── _layout.tsx               # QueryClientProvider, 권한 요청
│   ├── (tabs)/
│   │   ├── _layout.tsx           # 탭 네비게이터 (알림/일정/설정)
│   │   ├── index.tsx             # 감지된 일정 (pending)
│   │   ├── schedule.tsx          # 등록된 일정 (confirmed/synced)
│   │   └── settings.tsx          # 권한 + Google 로그인
│   └── schedule/
│       └── [id].tsx              # 일정 상세/수정
│
├── src/
│   ├── background/
│   │   └── notificationTask.ts   # Headless JS 태스크 함수 (export default)
│   ├── services/
│   │   ├── gemini.ts             # Gemini 2.0 Flash API
│   │   ├── googleAuth.ts         # OAuth 2.0 (Implicit Flow)
│   │   └── googleCalendar.ts     # Calendar API CRUD
│   ├── stores/
│   │   └── pendingScheduleStore.ts  # Zustand + AsyncStorage persist
│   ├── hooks/
│   │   └── useCalendarSync.ts    # TanStack Query mutation
│   ├── components/
│   │   └── notifications/
│   │       └── NotificationCard.tsx
│   ├── types/
│   │   ├── notification.ts
│   │   └── schedule.ts
│   └── utils/
│       └── queryClient.ts
│
└── android/                      # prebuild로 자동 생성 (수동 수정 금지)
```

---

## 7. 핵심 학습 포인트

| # | 교훈 |
|---|---|
| 1 | **Expo 패키지는 항상 `npx expo install`로** — SDK 호환 버전 자동 선택. `npm install`은 호환성 깨짐 |
| 2 | **`react-native-*` 라이브러리가 모두 config plugin을 가진 건 아님** — autolinking만으로 충분한 경우가 많음. `app.json` plugins 배열에 잘못 넣으면 빌드 실패 |
| 3 | **`android/` 폴더 수동 수정은 의미 없음** — EAS 서버에서 prebuild가 다시 실행되어 모두 덮어씀. config plugin으로 작성해야 영구적 |
| 4 | **Headless JS와 TaskManager는 다른 시스템** — `react-native-android-notification-listener`는 RN의 `AppRegistry.registerHeadlessTask`를 써야 함. `expo-task-manager`로는 안 됨 |
| 5 | **Zustand 셀렉터에서 새 객체/배열 반환 금지** — 무한 렌더 루프의 가장 흔한 원인 |
| 6 | **EAS Build는 git 저장소 단위로 업로드** — 부모 폴더가 큰 git 저장소면 디스크 부족 발생. 프로젝트는 독립 저장소로 |
| 7 | **`@types/react` 버전을 `react`와 맞춰야 함** — React 19를 쓰면 `@types/react`도 19여야 함 |
| 8 | **Android 12+ `intent-filter`가 있는 컴포넌트는 `android:exported` 필수** |
| 9 | **아이콘은 정사각형 진짜 PNG여야 함** — 확장자만 PNG인 JPG 안 됨, 와이드 비율 안 됨 |
| 10 | **Expo Auth Session의 기본은 Code Flow** — Implicit Flow로 토큰 직접 받으려면 `responseType: ResponseType.Token` 명시 |

---

## 8. 빌드/실행 명령어 요약

```bash
# 패키지 설치 (충돌 시)
npm install --legacy-peer-deps

# Expo 패키지 추가 (호환 버전 자동 선택)
npx expo install <package>

# 네이티브 폴더 재생성 (config plugin 변경 시)
npx expo prebuild --platform android --clean

# EAS 빌드 (개발용 APK)
eas build --profile development --platform android

# 개발 서버 실행
npx expo start --dev-client

# 같은 Wi-Fi 안 될 때 (회사망/공유기 격리)
npx expo start --dev-client --tunnel
```

---

## 9. 미해결 / TODO

- [ ] Google OAuth 로그인 동작 검증
- [ ] 실제 카카오톡/SMS로 알림 → Gemini 분석 → 캘린더 등록 end-to-end 테스트
- [ ] `.env.local`의 API 키가 백그라운드 Headless JS에서도 접근 가능한지 확인
- [ ] 알림 권한 거부 시 UX 처리
- [ ] 동일 알림 중복 방지 로직
- [ ] Gemini 분석 실패 시 사용자 알림

---

## 10. 런타임 검증 단계 (2차 디버깅)

빌드 성공 후 실제 폰에서 동작 검증하면서 발견한 문제들.

### 10-1. 검증 프로세스 정의
빌드 후 단계별 검증 순서를 정립:
1. **Stage 1**: 시스템 → 네이티브 → JS 태스크까지 알림 데이터가 도달하는가?
2. **Stage 2**: 타겟 앱 필터링 후 Gemini API 호출이 되는가?
3. **Stage 3**: Zustand 저장 + 푸시 알림 발송이 되는가?
4. **Stage 4**: Google Calendar 등록까지 end-to-end 작동하는가?

> Headless JS는 UI와 완전히 분리되어 동작하므로 UI 미완성 상태에서도 Stage 1~2 검증 가능.

### 10-2. 디버그 로그 추가
`notificationTask.ts` 각 분기점에 `console.log` 추가하여 어디서 막히는지 추적:
- payload 도달
- 타겟 앱 필터링 결과
- Gemini 분석 시작/완료
- confidence 결과
- 최종 저장

`npx expo start --dev-client` 실행 중인 터미널에 로그가 실시간으로 출력됨 (앱이 백그라운드에 있어도).

### 10-3. **Headless JS 페이로드 파싱 버그 (핵심 발견)**

**증상**: 타겟 앱 카카오톡/SMS의 알림이 와도 모두 `not target app: undefined`로 스킵됨.

**원인**: `react-native-android-notification-listener` v5는 알림 데이터를 직접 객체로 전달하지 않고 **JSON 문자열로 한 번 더 감싸서 전달**함:
```js
// 실제 페이로드 구조
{
  notification: '{"app":"com.kakao.talk","title":"...","text":"..."}'
}
```

이전 코드는 `notification.app`을 바로 읽으려 해서 항상 `undefined` 반환.

**해결**: 페이로드를 두 단계로 분리해서 처리
```ts
interface HeadlessPayload {
  notification: string | RawNotification;
}

const notification: RawNotification =
  typeof payload.notification === 'string'
    ? JSON.parse(payload.notification)
    : payload.notification;
```

> **교훈**: 네이티브 모듈이 데이터를 어떤 구조로 전달하는지 **실제 console.log로 찍어봐야** 알 수 있음. TypeScript 타입 정의는 라이브러리 작성자가 명시적으로 export하지 않는 한 추측에 의존.

### 10-4. 타겟 앱 목록 확장
실제로 본인이 자주 쓰는 앱 패키지명을 추가하면서 점진적으로 확장:
- `com.kakao.talk` (카카오톡)
- `com.android.mms` (기본 문자)
- `com.samsung.android.messaging` (삼성 문자)
- `com.google.android.apps.messaging` (Google Messages)
- `org.telegram.messenger` (텔레그램)

> 패키지명은 폰마다 다를 수 있음. Stage 1 로그에서 실제 알림이 어떤 패키지명으로 오는지 확인 후 추가.

### 10-5. 검증 결과 요약
| Stage | 상태 | 확인 방법 |
|---|---|---|
| 1. 알림 도달 | ✅ 통과 | Metro 로그에 `[NotificationTask] received: ...` 출력 |
| 2. 타겟 필터 → Gemini | 진행 중 | 카카오톡으로 일정 메시지 보내서 검증 필요 |
| 3. 저장 + 푸시 | 미검증 | Stage 2 통과 후 |
| 4. Calendar 등록 | 미검증 | OAuth 로그인 후 |

---

## 11. 추가 학습 포인트

| # | 교훈 |
|---|---|
| 11 | **네이티브 모듈의 페이로드 구조는 실제로 찍어봐야 함** — 라이브러리 README나 TS 타입을 100% 신뢰하면 안 됨. 특히 v5처럼 메이저 버전이 올라간 경우 |
| 12 | **Headless JS 디버깅은 Metro 로그가 핵심** — 앱이 닫혀 있어도 dev 서버에 연결되어 있으면 로그가 보임 |
| 13 | **단계별 검증 사고법** — UI/백엔드/통신을 분리해서 검증하면 어디가 문제인지 빠르게 좁혀짐. 한 번에 다 작동하길 기대하지 말 것 |
| 14 | **타사 AI 도구의 코드 제안은 시그니처 호환성을 따로 검토** — Gemini가 준 코드를 그대로 붙여넣으면 store/service 시그니처가 달라서 깨질 수 있음. 로직만 차용하고 우리 인터페이스에 맞게 어댑트 |
