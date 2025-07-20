import React, { useEffect } from 'react';
import { NativeModules, NativeEventEmitter, Text, View, PermissionsAndroid } from 'react-native';

const { TunerModule } = NativeModules;
const tunerEmitter = new NativeEventEmitter(TunerModule);

export default function App() {

  async function requestMicrophonePermission() {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Permissão de Microfone',
        message: 'O app precisa acessar o microfone para funcionar corretamente.',
        buttonPositive: 'Permitir',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  useEffect(() => {
    async function init() {
      const granted = await requestMicrophonePermission();
      if (granted) {
        const sub = tunerEmitter.addListener('onFrequencyDetected', ({ frequency }) => {
          console.log('Freq:', frequency.toFixed(2));
        });

        TunerModule.startTuning();

        return () => {
          TunerModule.stopTuning();
          sub.remove();
        };
      } else {
        console.warn('Permissão negada');
      }
    }

    init();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Ouça o som e detecte frequência (log)</Text>
    </View>
  );
}
