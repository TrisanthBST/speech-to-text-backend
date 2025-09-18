import fs from 'fs';
import axios from 'axios';

// Deepgram only (simplified)
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export async function transcribeAudio(filePath) {
  try {
    if (DEEPGRAM_API_KEY) {
      console.log('[Transcription] Using Deepgram provider');
      try {
        const result = await transcribeWithDeepgram(filePath);
        return { success: true, provider: 'deepgram', transcription: result.text, confidence: result.confidence, duration: result.duration };
      } catch (deepgramError) {
        console.warn('[Transcription] Deepgram failed, falling back to mock:', deepgramError.message);
        // Fall back to mock service if Deepgram fails
        const audioBuffer = fs.readFileSync(filePath);
        const mockTranscription = await mockTranscriptionService(audioBuffer);
        return { success: true, provider: 'mock', transcription: mockTranscription.text, confidence: mockTranscription.confidence, duration: mockTranscription.duration };
      }
    }

    console.warn('[Transcription] No provider configured, falling back to mock');
    const audioBuffer = fs.readFileSync(filePath);
    const mockTranscription = await mockTranscriptionService(audioBuffer);
    return { success: true, provider: 'mock', transcription: mockTranscription.text, confidence: mockTranscription.confidence, duration: mockTranscription.duration };
  } catch (error) {
    console.error('Transcription error:', error.response?.data || error.message || error);
    return { success: false, error: error.response?.data?.message || error.message || 'Transcription failed' };
  }
}

// Mock transcription service (replace with actual API integration)
async function mockTranscriptionService(audioBuffer) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return mock transcription
  return {
    text: "This is a mock transcription. In a real implementation, this would be replaced with actual speech-to-text API calls to Google Speech-to-Text, OpenAI Whisper, or Mozilla DeepSpeech.",
    confidence: 0.95,
    duration: 5.2
  };
}

// Removed Google/OpenAI providers for simplicity

// Deepgram transcription (requires DEEPGRAM_API_KEY)
async function transcribeWithDeepgram(filePath) {
  const audioStream = fs.createReadStream(filePath);
  const response = await axios.post(
    `${DEEPGRAM_API_URL}?model=nova-2&smart_format=true&language=en`,
    audioStream,
    {
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/octet-stream'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    }
  );

  // Deepgram response schema: response.data.results.channels[0].alternatives[0].transcript
  const alt = response.data?.results?.channels?.[0]?.alternatives?.[0];
  if (alt?.transcript !== undefined) {
    return {
      text: alt.transcript,
      confidence: typeof alt.confidence === 'number' ? alt.confidence : 1.0,
      duration: response.data?.metadata?.duration || 0
    };
  }
  throw new Error('No transcription result from Deepgram');
}
