import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/doubt', async (req, res) => {
  try {
    const { question, subject = '' } = req.body || {};

    const trimmedQuestion = String(question || '').trim();
    const trimmedSubject = String(subject || '').trim();

    if (!trimmedQuestion) {
      return res.status(400).json({
        success: false,
        message: 'question is required',
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const configuredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const modelCandidates = Array.from(
      new Set([
        configuredModel,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
      ])
    );

    if (!geminiApiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured in backend environment',
      });
    }

    const prompt = [
      'You are an academic assistant for university students.',
      'Give concise, correct, and easy-to-understand help.',
      'Use plain text only. Do not use Markdown symbols like **, ##, or code fences.',
      'Keep response readable using short paragraphs and simple numbered points.',
      trimmedSubject ? `Subject: ${trimmedSubject}` : '',
      `Student doubt: ${trimmedQuestion}`,
      'If needed, provide step-by-step explanation and a short summary.',
    ].filter(Boolean).join('\n\n');

    let lastErrorStatus = 500;
    let lastErrorMessage = 'Gemini request failed';

    for (const geminiModel of modelCandidates) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result?.error?.message || 'Gemini request failed';
        lastErrorStatus = response.status;
        lastErrorMessage = message;

        if (message.toLowerCase().includes('is not found') || message.toLowerCase().includes('not supported')) {
          continue;
        }

        return res.status(response.status).json({
          success: false,
          message,
        });
      }

      const answer = result?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('\n')
        .trim();

      if (!answer) {
        lastErrorStatus = 502;
        lastErrorMessage = 'Gemini returned empty response';
        continue;
      }

      return res.status(200).json({
        success: true,
        message: 'AI doubt response generated successfully',
        data: {
          answer,
          model: geminiModel,
        },
      });
    }

    return res.status(lastErrorStatus).json({
      success: false,
      message: lastErrorMessage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process AI doubt request',
      error: error.message,
    });
  }
});

export default router;
