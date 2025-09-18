import fs from 'fs';
import axios from 'axios';

// Deepgram only (simplified)
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export async function transcribeAudio(filePath) {
  try {
    console.log('[Transcription] Starting transcription for:', filePath);
    console.log('[Transcription] Deepgram API Key configured:', !!DEEPGRAM_API_KEY);
    
    if (DEEPGRAM_API_KEY) {
      console.log('[Transcription] Using Deepgram provider');
      try {
        const result = await transcribeWithDeepgram(filePath);
        console.log('[Transcription] Deepgram success:', result.text.substring(0, 100) + '...');
        return { success: true, provider: 'deepgram', transcription: result.text, confidence: result.confidence, duration: result.duration };
      } catch (deepgramError) {
        console.error('[Transcription] Deepgram failed:', {
          message: deepgramError.message,
          status: deepgramError.response?.status,
          statusText: deepgramError.response?.statusText,
          data: deepgramError.response?.data
        });
        console.warn('[Transcription] Falling back to mock service');
        // Fall back to mock service if Deepgram fails
        const audioBuffer = fs.readFileSync(filePath);
        const mockTranscription = await mockTranscriptionService(audioBuffer);
        return { success: true, provider: 'mock', transcription: mockTranscription.text, confidence: mockTranscription.confidence, duration: mockTranscription.duration };
      }
    }

    console.warn('[Transcription] No Deepgram API key configured, using mock service');
    const audioBuffer = fs.readFileSync(filePath);
    const mockTranscription = await mockTranscriptionService(audioBuffer);
    return { success: true, provider: 'mock', transcription: mockTranscription.text, confidence: mockTranscription.confidence, duration: mockTranscription.duration };
  } catch (error) {
    console.error('[Transcription] Critical error:', {
      message: error.message,
      stack: error.stack,
      filePath: filePath,
      fileExists: fs.existsSync(filePath)
    });
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
  try {
    console.log('[Deepgram] Processing file:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }
    
    const fileStats = fs.statSync(filePath);
    console.log('[Deepgram] File size:', fileStats.size, 'bytes');
    
    if (fileStats.size === 0) {
      throw new Error('Audio file is empty');
    }
    
    if (fileStats.size > 10 * 1024 * 1024) {
      throw new Error('Audio file too large (max 10MB)');
    }
    
    const audioStream = fs.createReadStream(filePath);
    
    console.log('[Deepgram] Making API request to:', `${DEEPGRAM_API_URL}?model=nova-2&smart_format=true&language=en`);
    
    const response = await axios.post(
      `${DEEPGRAM_API_URL}?model=nova-2&smart_format=true&language=en`,
      audioStream,
      {
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/octet-stream'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log('[Deepgram] Response status:', response.status);
    console.log('[Deepgram] Response data structure:', {
      hasResults: !!response.data?.results,
      hasChannels: !!response.data?.results?.channels,
      channelCount: response.data?.results?.channels?.length || 0
    });

    // Deepgram response schema: response.data.results.channels[0].alternatives[0].transcript
    const alt = response.data?.results?.channels?.[0]?.alternatives?.[0];
    if (alt?.transcript !== undefined) {
      const result = {
        text: alt.transcript,
        confidence: typeof alt.confidence === 'number' ? alt.confidence : 1.0,
        duration: response.data?.metadata?.duration || 0
      };
      console.log('[Deepgram] Transcription result:', {
        textLength: result.text.length,
        confidence: result.confidence,
        duration: result.duration
      });
      return result;
    }
    
    console.error('[Deepgram] No transcript in response:', JSON.stringify(response.data, null, 2));
    throw new Error('No transcription result from Deepgram - empty or invalid response');
    
  } catch (error) {
    if (error.response) {
      console.error('[Deepgram] API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
      
      if (error.response.status === 401) {
        throw new Error('Deepgram API authentication failed - invalid API key');
      } else if (error.response.status === 400) {
        throw new Error(`Deepgram API error: ${error.response.data?.message || 'Bad request'}`);
      } else if (error.response.status === 429) {
        throw new Error('Deepgram API rate limit exceeded');
      }
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Deepgram API - network error');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Deepgram API hostname not found - check internet connection');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Deepgram API request timed out');
    }
    
    console.error('[Deepgram] Unexpected error:', error);
    throw error;
  }
}
