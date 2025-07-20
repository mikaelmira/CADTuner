package com.tuner

import android.media.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.concurrent.thread

class TunerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var recording = false

  override fun getName() = "TunerModule"

  @ReactMethod
  fun startTuning() {
    if (recording) return
    recording = true

    thread(start = true) {
      try {
        val sampleRate = 44100
        val bufferSize = AudioRecord.getMinBufferSize(
          sampleRate,
          AudioFormat.CHANNEL_IN_MONO,
          AudioFormat.ENCODING_PCM_16BIT
        )

        val recorder = AudioRecord(
          MediaRecorder.AudioSource.MIC,
          sampleRate,
          AudioFormat.CHANNEL_IN_MONO,
          AudioFormat.ENCODING_PCM_16BIT,
          bufferSize
        )

        val adjustedBufferSize = 8192
        val buffer = ShortArray(adjustedBufferSize)
        recorder.startRecording()

        while (recording) {
          val read = recorder.read(buffer, 0, buffer.size)
          if (read > 0) {
            val frequency = detectFrequency(buffer, sampleRate)
            if (frequency in 30.0..2000.0) {
              sendFrequencyToJS(frequency)
            }
          }
        }

        recorder.stop()
        recorder.release()
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  @ReactMethod
  fun stopTuning() {
    recording = false
  }

  private fun detectFrequency(buffer: ShortArray, sampleRate: Int): Double {
    val size = buffer.size
    val window = DoubleArray(size) { i -> 0.5 - 0.5 * kotlin.math.cos(2.0 * Math.PI * i / size) }

    val windowed = DoubleArray(size)
    var rms = 0.0
    for (i in buffer.indices) {
        windowed[i] = buffer[i] * window[i]
        rms += windowed[i] * windowed[i]
    }
    rms = kotlin.math.sqrt(rms / size)
    if (rms < 0.01) return 0.0

    val autocorrelation = DoubleArray(size)
    for (lag in 0 until size) {
        var sum = 0.0
        for (i in 0 until size - lag) {
            sum += windowed[i] * windowed[i + lag]
        }
        autocorrelation[lag] = sum
    }

    // Ignorar o pico em lag=0
    val start = 30
    val peakIndex = (start until size).maxByOrNull { autocorrelation[it] } ?: return 0.0

    // Interpolação parabólica
    val prev = autocorrelation.getOrElse(peakIndex - 1) { 0.0 }
    val next = autocorrelation.getOrElse(peakIndex + 1) { 0.0 }
    val delta = (next - prev) / (2 * (2 * autocorrelation[peakIndex] - prev - next))
    val refinedPeak = peakIndex + delta

    val frequency = sampleRate / refinedPeak
    return if (frequency in 30.0..2000.0) frequency else 0.0
  }


  private fun sendFrequencyToJS(frequency: Double) {
    val params = Arguments.createMap()
    params.putDouble("frequency", frequency)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onFrequencyDetected", params)
  }

  // @ReactMethod
  // override fun addListener(eventName: String) {
  // }

  // @ReactMethod
  // override fun removeListeners(count: Int) {
  // }
}
