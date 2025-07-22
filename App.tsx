import React, { useEffect, useState, useRef } from 'react'
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
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { getNoteData, NoteData } from './src/utils/tuning'

const { TunerModule } = NativeModules
const tunerEmitter = new NativeEventEmitter(TunerModule)
import LinearGradient from 'react-native-linear-gradient'

export default function App() {
  const [note, setNote] = useState<NoteData | null>(null)
  const [angle] = useState(new Animated.Value(0))
  const lastStableNote = useRef<string | null>(null)
  const streak = useRef<number>(0)
  const STABILITY_THRESHOLD = 3

  useEffect(() => {
    async function init() {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      )
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        const sub = tunerEmitter.addListener('onFrequencyDetected', ({ frequency }) => {
          const noteData = getNoteData(frequency)
          if (noteData.note === lastStableNote.current) {
            streak.current += 1
          } else {
            streak.current = 1
            lastStableNote.current = noteData.note
          }

          if (streak.current >= STABILITY_THRESHOLD) {
            setNote(noteData)

            const clamped = Math.max(-50, Math.min(50, noteData.cents))
            const newAngle = (clamped / 50) * 45

            Animated.timing(angle, {
              toValue: newAngle,
              duration: 100,
              useNativeDriver: true,
              easing: Easing.linear,
            }).start()
          }
        })

        TunerModule.startTuning()
        return () => {
          TunerModule.stopTuning()
          sub.remove()
        }
      }
    }

    init()
  }, [])

  const [ledOn, setLedOn] = useState(false)

  useEffect(() => {
    if (note && Math.abs(note.cents) < 5) {
      setLedOn(true)
    } else {
      setLedOn(false)
    }
  }, [note])

  return (
    <View style={styles.container}>
      <View style={styles.pedal}>
        {/* Parafusos */}
        <View style={styles.screwTopLeft} />
        <View style={styles.screwTopRight} />
        <View style={styles.screwBottomLeft} />
        <View style={styles.screwBottomRight} />



        {/* Visor Digital */}
        <View style={styles.display}>
          <View style={styles.ledArc}>
            <Svg width="100%" height="100%" viewBox="0 68 240 170" style={StyleSheet.absoluteFill}>
              <Path
                d="M30,120 A90,128 90 0,1 210,120"
                stroke="#222"
                strokeWidth="26"
                fill="none"
                strokeLinecap="round"
              />
            </Svg>

            {Array.from({ length: 11 }, (_, i) => {
              // Ângulo entre -60° e +60° (em radianos)
              const angle = ((i / 10) * Math.PI / 3) - (Math.PI / 6)
              const radius = 120 // raio do arco
              const x = radius * Math.sin(angle)
              const y = radius * Math.cos(angle)

              const activeIndex = note ? Math.round((note.cents + 50) / 10) : -1
              let color = '#222'

              if (i === activeIndex) {
                if (i === 5) color = '#0f0'
                else if (i >= 4 && i <= 6) color = '#ff0'
                else color = '#f00'
              }
              return (
                <View
                  key={i}
                  style={[
                    styles.block,
                    {
                      backgroundColor: color,
                      left: x + radius - 5,
                      top: radius - y + 10,
                      transform: [{ rotate: `${angle}rad` }],
                    },
                  ]}
                />
              )
            })}
          </View>
        </View>

        {/* Visor de Nota */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{note ? note.note : '-'}</Text>
        </View>

        {/* Estado textual */}
        <Text
          style={[
            styles.status,
            {
              color:
                !note
                  ? '#999'
                  : Math.abs(note.cents) < 5
                    ? '#0f0'
                    : note.cents > 0
                      ? '#f90'
                      : '#f33',
            },
          ]}
        >
          {!note
            ? 'Aguardando'
            : Math.abs(note.cents) < 5
              ? 'Afinação OK'
              : note.cents > 0
                ? 'Pouco Alta'
                : 'Pouco Baixa'}
        </Text>

        {/* Botão de footswitch */}
        <LinearGradient
          colors={['#333', '#111']}
          style={styles.footSwitch}
        >
          <View style={styles.footInner} />
        </LinearGradient>
      </View>
    </View>
  )
}

const screwStyle = {
  width: 12,
  height: 12,
  backgroundColor: '#555',
  borderRadius: 6,
  borderWidth: 2,
  borderColor: '#333',
  position: 'absolute',
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledArc: {
    width: 240,
    height: 120,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  block: {
    width: 10,
    height: 16,
    borderRadius: 2,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 1,
  },


  ledMeter: {
    width: 240,
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    marginTop: 8,
    transform: [{ rotate: '-5deg' }],
  },
  ledBlock: {
    width: 12,
    height: 40,
    marginHorizontal: 1,
    borderRadius: 4,
    backgroundColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 1,
  },

  pedal: {
    width: 280,
    height: 400,
    backgroundColor: '#222',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#0ff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    position: 'relative',
  },
  screwTopLeft: {
    width: 12,
    height: 12,
    backgroundColor: '#555',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    position: 'absolute',
    top: 8,
    left: 8,
  },
  screwTopRight: {
    width: 12,
    height: 12,
    backgroundColor: '#555',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  screwBottomLeft: {
    width: 12,
    height: 12,
    backgroundColor: '#555',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  screwBottomRight: {
    width: 12,
    height: 12,
    backgroundColor: '#555',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  display: {
    width: 240,
    height: 120,
    backgroundColor: '#000',
    borderColor: '#0ff',
    borderWidth: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  needle: {
    width: 4,
    height: 60,
    backgroundColor: '#0f0',
    position: 'absolute',
    bottom: 30,
  },
  noteBox: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0ff',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0ff',
  },
  status: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  led: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#222',
    position: 'absolute',
    top: 40,
    zIndex: 10,
  },
  ledLeft: {
    left: 16,
  },
  ledRight: {
    right: 16,
  },
  ledOn: {
    backgroundColor: '#0f0',
    shadowColor: '#0f0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  footSwitch: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#444',
    borderWidth: 2,
  },
  footInner: {
    width: 32,
    height: 32,
    backgroundColor: '#888',
    borderRadius: 16,
    borderColor: '#222',
    borderWidth: 2,
  },

})
