import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
} from 'react-native'
import { getNoteData, NoteData } from './src/utils/tuning'

const { TunerModule } = NativeModules
const tunerEmitter = new NativeEventEmitter(TunerModule)

export default function App() {
  const [note, setNote] = useState<NoteData | null>(null)
  const [angle] = useState(new Animated.Value(0))

  useEffect(() => {
    async function init() {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      )
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        const sub = tunerEmitter.addListener(
          'onFrequencyDetected',
          ({ frequency }) => {
            const noteData = getNoteData(frequency)
            setNote(noteData)

            const clamped = Math.max(-50, Math.min(50, noteData.cents))
            const newAngle = (clamped / 50) * 45

            Animated.timing(angle, {
              toValue: newAngle,
              duration: 100,
              useNativeDriver: true,
              easing: Easing.linear,
            }).start()
          },
        )

        TunerModule.startTuning()

        return () => {
          TunerModule.stopTuning()
          sub.remove()
        }
      }
    }

    init()
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Afinador Cromático</Text>
      <View style={styles.needleContainer}>
        <View style={styles.guideLine} />
        <Animated.View
          style={[
            styles.needle,
            {
              transform: [
                {
                  rotate: angle.interpolate({
                    inputRange: [-45, 45],
                    outputRange: ['-45deg', '45deg'],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      {note && (
        <>
          <Text style={styles.noteText}>{note.note}</Text>
          <Text style={styles.detail}>
            {note.cents.toFixed(1)} cents • {note.frequency.toFixed(1)} Hz
          </Text>
          <Text
            style={[
              styles.status,
              {
                color:
                  Math.abs(note.cents) < 5
                    ? 'green'
                    : note.cents > 0
                    ? 'orange'
                    : 'red',
              },
            ]}
          >
            {Math.abs(note.cents) < 5
              ? 'Afinação OK'
              : note.cents > 0
              ? 'Pouco Alta'
              : 'Pouco Baixa'}
          </Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  needleContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  needle: {
    width: 4,
    height: 100,
    backgroundColor: '#0f0',
    position: 'absolute',
    bottom: 100,
  },
  guideLine: {
    position: 'absolute',
    width: 2,
    height: 100,
    backgroundColor: '#555',
    bottom: 100,
  },
  noteText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  detail: {
    fontSize: 18,
    color: '#aaa',
    marginTop: 8,
  },
  status: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: 'bold',
  },
})

