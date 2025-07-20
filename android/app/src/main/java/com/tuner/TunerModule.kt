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

        val buffer = ShortArray(bufferSize)
        recorder.startRecording()

        while (recording) {
          val read = recorder.read(buffer, 0, buffer.size)
          if (read > 0) {
            val frequency = detectFrequency(buffer, sampleRate)
            if (frequency in 50.0..1000.0) {
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
    val autocorrelation = DoubleArray(size)

    for (lag in 0 until size) {
      var sum = 0.0
      for (i in 0 until size - lag) {
        sum += buffer[i] * buffer[i + lag]
      }
      autocorrelation[lag] = sum
    }

    val peak = autocorrelation
      .withIndex()
      .drop(1)
      .maxByOrNull { it.value } ?: return 0.0

    return sampleRate.toDouble() / peak.index
  }

  private fun sendFrequencyToJS(frequency: Double) {
    val params = Arguments.createMap()
    params.putDouble("frequency", frequency)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onFrequencyDetected", params)
  }

  @ReactMethod
  override fun addListener(eventName: String) {
  }

  @ReactMethod
  override fun removeListeners(count: Int) {
  }
}
