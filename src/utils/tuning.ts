export type NoteData = {
  note: string
  frequency: number
  cents: number
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function getNoteData(frequency: number): NoteData {
  const A4 = 440
  const SEMITONE = 12
  const noteNumber = Math.round(SEMITONE * Math.log2(frequency / A4) + 57)
  const noteIndex = noteNumber % 12
  const octave = Math.floor(noteNumber / 12) - 1
  const nearestFrequency = A4 * Math.pow(2, (noteNumber - 57) / SEMITONE)
  const cents = 1200 * Math.log2(frequency / nearestFrequency)

  return {
    note: `${NOTES[noteIndex]}${octave}`,
    frequency: nearestFrequency,
    cents,
  }
}
