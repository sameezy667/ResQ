/**
 * AI Image Analysis Service
 * Uses Google Gemini AI to analyze incident photos and extract insights
 */

import { GoogleGenAI } from '@google/genai';

export interface AIAnalysisResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  incidentType: 'fire' | 'medical' | 'accident' | 'crime' | 'other';
  description: string;
  hazards: string[];
  recommendations: string[];
  confidence: number;
}

/**
 * Analyze incident image using Google Gemini Flash Lite Latest
 */
export async function analyzeIncidentImage(imageFile: File): Promise<AIAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('Gemini API key not configured, returning default analysis');
    return getDefaultAnalysis();
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Convert image to base64
    const imageData = await fileToBase64(imageFile);

    const model = 'gemini-flash-lite-latest';

    const prompt = `You are an emergency response AI assistant analyzing an incident photo. 
Analyze this image and provide:
1. Incident severity (low/medium/high/critical)
2. Incident type (fire/medical/accident/crime/other)
3. Brief description of what you see
4. List of potential hazards
5. Recommendations for responders
6. Confidence level (0-100)

Respond in JSON format:
{
  "severity": "low|medium|high|critical",
  "incidentType": "fire|medical|accident|crime|other",
  "description": "brief description",
  "hazards": ["hazard1", "hazard2"],
  "recommendations": ["rec1", "rec2"],
  "confidence": 85
}`;

    const contents = [
      {
        role: 'user' as const,
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: imageData,
            },
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
    });

    const text = response.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      severity: analysis.severity || 'medium',
      incidentType: analysis.incidentType || 'other',
      description: analysis.description || 'AI analysis completed',
      hazards: analysis.hazards || [],
      recommendations: analysis.recommendations || [],
      confidence: analysis.confidence || 50,
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return getDefaultAnalysis();
  }
}

/**
 * Convert File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get default analysis when AI is unavailable
 */
function getDefaultAnalysis(): AIAnalysisResult {
  return {
    severity: 'medium',
    incidentType: 'other',
    description: 'Image uploaded successfully. AI analysis unavailable.',
    hazards: [],
    recommendations: ['Verify incident details', 'Dispatch appropriate units'],
    confidence: 0,
  };
}

/**
 * Generate AI-enhanced incident description
 */
export async function generateIncidentDescription(
  type: string,
  userDescription: string,
  aiAnalysis?: AIAnalysisResult
): Promise<string> {
  if (!aiAnalysis || aiAnalysis.confidence < 50) {
    return userDescription;
  }

  const parts = [userDescription];

  if (aiAnalysis.description && aiAnalysis.description !== userDescription) {
    parts.push(`AI Analysis: ${aiAnalysis.description}`);
  }

  if (aiAnalysis.hazards.length > 0) {
    parts.push(`Hazards detected: ${aiAnalysis.hazards.join(', ')}`);
  }

  return parts.join('. ');
}
