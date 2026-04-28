const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNotificationListener(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // xmlns:tools 네임스페이스 추가
    androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // allowBackup 충돌 해결
    application.$['tools:replace'] = 'android:allowBackup';

    // 중복 방지
    if (!application.service) application.service = [];
    const SERVICE_NAME = 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener';
    const alreadyAdded = application.service.some(
      (s) => s.$['android:name'] === SERVICE_NAME
    );

    if (!alreadyAdded) {
      application.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:label': '@string/app_name',
          'android:exported': 'false',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        },
        'intent-filter': [
          {
            action: [
              {
                $: { 'android:name': 'android.service.notification.NotificationListenerService' },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};
