import express from 'express';
import path from 'path';
import multer from 'multer';
import fetch from 'node-fetch';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const buildModelCandidates = () =>
  Array.from(
    new Set([
      process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
    ]),
  );

const stripCodeFences = (value) =>
  String(value || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

const extractJsonBlock = (rawText) => {
  const text = stripCodeFences(rawText);
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return text;
};

const toStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const parseScoreOutOf100 = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  if (parsed <= 10) {
    return Math.max(0, Math.min(100, Math.round(parsed * 10)));
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const isQuotaOrRateLimitError = (errorOrMessage) => {
  const message = String(errorOrMessage?.message || errorOrMessage || '').toLowerCase();
  return (
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('resource exhausted') ||
    message.includes('too many requests') ||
    message.includes('billing') ||
    message.includes('429')
  );
};

const getFallbackAptitudeQuestions = (difficulty = 'medium') => {
  const hardLevel = String(difficulty || '').toLowerCase() === 'hard';
  const easyLevel = String(difficulty || '').toLowerCase() === 'easy';

  const sets = {
    easy: [
      { question: 'Find the next number: 2, 4, 8, 16, ?', options: ['18', '24', '32', '30'], correctAnswer: '32', explanation: 'Pattern is multiplying by 2 each time.' },
      { question: 'A train speed is 60 km/h. Distance in 2 hours?', options: ['100 km', '110 km', '120 km', '130 km'], correctAnswer: '120 km', explanation: 'Distance = speed x time = 60 x 2.' },
      { question: 'Choose the correct synonym of quick.', options: ['Slow', 'Rapid', 'Late', 'Weak'], correctAnswer: 'Rapid', explanation: 'Rapid means fast or quick.' },
      { question: 'If all roses are flowers and some flowers fade quickly, which is true?', options: ['All roses fade quickly', 'Some flowers fade quickly', 'No flowers fade quickly', 'All flowers are roses'], correctAnswer: 'Some flowers fade quickly', explanation: 'Directly stated in premise.' },
      { question: 'What is 25% of 200?', options: ['25', '40', '50', '60'], correctAnswer: '50', explanation: '25% of 200 = 0.25 x 200.' },
      { question: 'Choose the correct sentence.', options: ['She go to college.', 'She goes to college.', 'She going to college.', 'She gone to college.'], correctAnswer: 'She goes to college.', explanation: 'Subject-verb agreement with singular subject.' },
      { question: 'A bag has 3 red and 2 blue balls. Probability of red?', options: ['2/5', '3/5', '1/5', '4/5'], correctAnswer: '3/5', explanation: 'Favorable outcomes 3, total outcomes 5.' },
      { question: 'Complete analogy: Pen : Write :: Knife : ?', options: ['Cut', 'Eat', 'Paint', 'Sing'], correctAnswer: 'Cut', explanation: 'Knife is used to cut.' },
      { question: 'If x + 5 = 12, then x = ?', options: ['5', '6', '7', '8'], correctAnswer: '7', explanation: 'Subtract 5 from both sides.' },
      { question: 'One word substitution for fear of heights.', options: ['Claustrophobia', 'Acrophobia', 'Arachnophobia', 'Hydrophobia'], correctAnswer: 'Acrophobia', explanation: 'Acrophobia means fear of heights.' },
    ],
    medium: [
      { question: 'Find missing term: 3, 8, 15, 24, ?', options: ['30', '32', '35', '36'], correctAnswer: '35', explanation: 'Differences are 5, 7, 9, next is 11.' },
      { question: 'If CP = 400 and gain = 20%, SP = ?', options: ['460', '470', '480', '500'], correctAnswer: '480', explanation: 'SP = CP x 1.20.' },
      { question: 'A and B complete work in 12 and 18 days. Together they finish in?', options: ['6.2 days', '7.2 days', '8.5 days', '9 days'], correctAnswer: '7.2 days', explanation: 'Combined rate = 1/12 + 1/18 = 5/36.' },
      { question: 'Choose the grammatically correct option.', options: ['Neither of them are ready.', 'Neither of them is ready.', 'Neither them is ready.', 'Neither are ready.'], correctAnswer: 'Neither of them is ready.', explanation: 'Neither takes singular verb.' },
      { question: 'Statement: Some coders are designers. Conclusion: Some designers are coders.', options: ['True', 'False', 'Cannot be determined', 'None'], correctAnswer: 'True', explanation: 'Conversion of “some A are B” is valid.' },
      { question: 'Simple interest on Rs.5000 at 8% for 3 years?', options: ['1000', '1100', '1200', '1300'], correctAnswer: '1200', explanation: 'SI = PRT/100 = 5000 x 8 x 3 / 100.' },
      { question: 'Choose the closest meaning of concise.', options: ['Lengthy', 'Brief', 'Unclear', 'Complex'], correctAnswer: 'Brief', explanation: 'Concise means brief and to the point.' },
      { question: 'If 15 men do a job in 20 days, 10 men will do it in?', options: ['25 days', '28 days', '30 days', '32 days'], correctAnswer: '30 days', explanation: 'Work is constant: men x days.' },
      { question: 'Find odd one out: 2, 3, 5, 9, 11', options: ['2', '3', '5', '9'], correctAnswer: '9', explanation: 'Others are prime numbers.' },
      { question: 'A car covers first half distance at 40 km/h and second half at 60 km/h. Average speed?', options: ['48 km/h', '50 km/h', '52 km/h', '55 km/h'], correctAnswer: '48 km/h', explanation: 'Average speed for equal distance = 2ab/(a+b).' },
    ],
    hard: [
      { question: 'Find next term: 1, 2, 6, 24, 120, ?', options: ['600', '720', '840', '960'], correctAnswer: '720', explanation: 'Factorial pattern n!.' },
      { question: 'If x:y = 3:5 and y:z = 10:7, then x:z = ?', options: ['3:7', '6:7', '7:6', '9:14'], correctAnswer: '6:7', explanation: 'Normalize y and combine ratios.' },
      { question: 'A can do work in 15 days, B in 20 days. After 5 days together B leaves. Remaining work by A in?', options: ['4 days', '5 days', '6 days', '7 days'], correctAnswer: '5 days', explanation: 'Done in 5 days = 7/12, remaining 5/12 by A.' },
      { question: 'The probability of getting sum 9 from two dice is', options: ['1/9', '1/12', '1/6', '1/18'], correctAnswer: '1/9', explanation: 'Favorable pairs: (3,6),(4,5),(5,4),(6,3).' },
      { question: 'Choose correct sentence.', options: ['Hardly had I reached when it started raining.', 'Hardly I had reached when it started raining.', 'Hardly had I reached than it started raining.', 'Hardly I reached when it started raining.'], correctAnswer: 'Hardly had I reached when it started raining.', explanation: 'Correct inversion with “hardly ... when”.' },
      { question: 'If 30% of A = 45% of B, then A:B = ?', options: ['2:3', '3:2', '4:5', '5:4'], correctAnswer: '3:2', explanation: '0.30A = 0.45B => A/B = 1.5.' },
      { question: 'Find odd one: 64, 81, 100, 121, 144, 169, 196, 225, 243', options: ['169', '196', '225', '243'], correctAnswer: '243', explanation: 'Others are squares; 243 is 3^5.' },
      { question: 'Boat speed in still water is 12 km/h, stream speed 3 km/h. Upstream speed?', options: ['6 km/h', '8 km/h', '9 km/h', '10 km/h'], correctAnswer: '9 km/h', explanation: 'Upstream = still water - stream.' },
      { question: 'Statement: All managers are leaders. Some leaders are mentors. Conclusion: Some managers are mentors.', options: ['Definitely true', 'Definitely false', 'Cannot be determined', 'None'], correctAnswer: 'Cannot be determined', explanation: 'No direct overlap guaranteed between managers and mentors.' },
      { question: 'A sum doubles in 6 years at compound interest. Approx yearly rate?', options: ['10.2%', '11.6%', '12.2%', '14.1%'], correctAnswer: '12.2%', explanation: 'Using 72 rule or (1+r)^6 = 2 gives about 12.2%.' },
    ],
  };

  const selected = hardLevel ? sets.hard : easyLevel ? sets.easy : sets.medium;
  return selected.map((item, index) => ({ id: index + 1, ...item }));
};

const getFallbackInterviewQuestions = ({ jobRole, companyName }) => {
  const role = String(jobRole || 'Candidate').trim();
  const company = String(companyName || 'the company').trim();

  const rows = [
    {
      question: `Tell me about yourself and why you are a good fit for the ${role} role at ${company}.`,
      interviewerGoal: 'Assess communication, clarity, and role alignment.',
      answerStructure: 'Present background, key projects, skills, and role-fit in 60-90 seconds.',
      tips: 'Keep it relevant, avoid full biography, and end with value you bring.',
    },
    {
      question: 'Describe a challenging project and how you solved key problems.',
      interviewerGoal: 'Evaluate problem-solving depth and ownership.',
      answerStructure: 'Use STAR: challenge, actions taken, tools used, measurable impact.',
      tips: 'Highlight trade-offs and what you learned.',
    },
    {
      question: 'How do you prioritize tasks when deadlines overlap?',
      interviewerGoal: 'Check planning and execution discipline.',
      answerStructure: 'Explain prioritization framework, communication, and follow-through.',
      tips: 'Mention urgency vs impact and stakeholder alignment.',
    },
    {
      question: 'Explain a technical concept from your domain to a non-technical person.',
      interviewerGoal: 'Assess clarity and audience awareness.',
      answerStructure: 'Use simple analogy, avoid jargon, and confirm understanding.',
      tips: 'Focus on business value and practical outcome.',
    },
    {
      question: `Why do you want to work at ${company}?`,
      interviewerGoal: 'Measure preparation and motivation.',
      answerStructure: 'Connect company mission, team work, and your strengths.',
      tips: 'Reference specific products, culture, or recent initiatives.',
    },
    {
      question: 'Tell me about a time you received critical feedback.',
      interviewerGoal: 'Check growth mindset and adaptability.',
      answerStructure: 'State feedback, response steps, and improved results.',
      tips: 'Avoid defensive tone; show concrete improvement.',
    },
    {
      question: 'How do you ensure quality before submitting your work?',
      interviewerGoal: 'Understand quality process and accountability.',
      answerStructure: 'Discuss checklists, testing/review, and validation steps.',
      tips: 'Share one real example where this prevented an issue.',
    },
    {
      question: 'Describe a time you worked with a difficult teammate.',
      interviewerGoal: 'Evaluate collaboration and conflict management.',
      answerStructure: 'Cover context, communication method, resolution, and result.',
      tips: 'Focus on professionalism and outcomes, not blame.',
    },
    {
      question: `What would your first 90 days in this ${role} role look like?`,
      interviewerGoal: 'Assess role understanding and execution plan.',
      answerStructure: 'Break into learning, contribution, and optimization phases.',
      tips: 'Mention quick wins and measurable goals.',
    },
    {
      question: 'Do you have any questions for us?',
      interviewerGoal: 'Check curiosity and seriousness.',
      answerStructure: 'Ask about team goals, success metrics, and growth opportunities.',
      tips: 'Avoid generic questions; ask role-specific and thoughtful ones.',
    },
  ];

  return rows.map((item, index) => ({ id: index + 1, ...item }));
};

const callGemini = async (prompt, { expect = 'object' } = {}) => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment');
  }

  let lastError = 'Gemini request failed';

  for (const geminiModel of buildModelCandidates()) {
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

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error?.message || `Gemini request failed (${response.status})`;
      lastError = message;

      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('not supported')) {
        continue;
      }

      throw new Error(message);
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('\n')
      .trim();

    if (!text) {
      lastError = 'Gemini returned an empty response';
      continue;
    }

    try {
      const parsedText = extractJsonBlock(text);
      if (expect === 'array') {
        const parsedArray = JSON.parse(parsedText);
        if (!Array.isArray(parsedArray)) {
          throw new Error('Gemini returned non-array payload');
        }
        return { model: geminiModel, data: parsedArray };
      }

      const parsedObject = JSON.parse(parsedText);
      if (parsedObject === null || typeof parsedObject !== 'object' || Array.isArray(parsedObject)) {
        throw new Error('Gemini returned non-object payload');
      }
      return { model: geminiModel, data: parsedObject };
    } catch {
      lastError = 'Failed to parse Gemini JSON response';
      continue;
    }
  }

  throw new Error(lastError);
};

const extractResumeTextFromFile = async (file) => {
  if (!file?.buffer) {
    return '';
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();

  if (mimeType.includes('pdf') || extension === '.pdf') {
    const parser = new PDFParse({ data: file.buffer });
    const parsedPdf = await parser.getText();
    await parser.destroy();
    return String(parsedPdf?.text || '').trim();
  }

  if (
    mimeType.includes('wordprocessingml.document') ||
    extension === '.docx'
  ) {
    const parsedDocx = await mammoth.extractRawText({ buffer: file.buffer });
    return String(parsedDocx?.value || '').trim();
  }

  if (mimeType.startsWith('text/') || extension === '.txt') {
    return file.buffer.toString('utf8').trim();
  }

  throw new Error('Unsupported resume format. Upload PDF, DOCX, or TXT file.');
};

// Analyze Resume - Score and Suggestions
router.post('/analyze-resume', verifyToken, upload.single('resumeFile'), async (req, res) => {
  try {
    const directResumeText = String(req.body?.resumeText || '').trim();
    const extractedResumeText = await extractResumeTextFromFile(req.file);
    const resumeText = (directResumeText || extractedResumeText).trim();

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        message: 'Resume content is required. Paste text or upload a resume file.',
      });
    }

    const prompt = [
      'You are a professional ATS and HR consultant.',
      'Analyze the resume and respond ONLY with valid JSON (no markdown).',
      'Return this exact schema:',
      '{',
      '  "score": number,',
      '  "strengths": string[],',
      '  "improvements": string[],',
      '  "suggestions": string[],',
      '  "missingSections": string[]',
      '}',
      'Score must be out of 100.',
      'Keep each list item concise and practical.',
      `Resume:\n${resumeText}`,
    ].join('\n');

    const { data: analysis } = await callGemini(prompt, { expect: 'object' });

    res.json({
      success: true,
      analysis: {
        score: parseScoreOutOf100(analysis.score),
        strengths: toStringArray(analysis.strengths),
        improvements: toStringArray(analysis.improvements),
        suggestions: toStringArray(analysis.suggestions),
        missingSections: toStringArray(analysis.missingSections),
        extractedTextLength: resumeText.length,
      },
    });
  } catch (error) {
    console.error('Resume analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze resume',
      error: error.message,
    });
  }
});

// Generate Aptitude Test Questions
router.post('/aptitude-test', verifyToken, async (req, res) => {
  try {
    const { difficulty = 'medium' } = req.body;

    const prompt = [
      `Create 10 ${difficulty} level campus-placement MCQs.`,
      'Mix: 3 logical, 4 quantitative, 3 verbal.',
      'Return JSON array only.',
      'Each item keys: question, options, correctAnswer, explanation.',
      'Rules: options must have exactly 4 short strings; correctAnswer must exactly match one option.',
      'Keep explanation under 18 words.',
    ].join('\n');

    const { data: generatedQuestions } = await callGemini(prompt, { expect: 'array' });

    const questions = generatedQuestions
      .map((q, index) => {
        const options = toStringArray(q?.options).slice(0, 4);
        const fallbackOptions = options.length === 4
          ? options
          : ['Option A', 'Option B', 'Option C', 'Option D'];

        let correctAnswer = String(q?.correctAnswer || '').trim();
        if (/^[A-D]$/i.test(correctAnswer)) {
          const answerIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65;
          correctAnswer = fallbackOptions[answerIndex] || fallbackOptions[0];
        }

        if (!fallbackOptions.includes(correctAnswer)) {
          correctAnswer = fallbackOptions[0];
        }

        return {
          id: index + 1,
          question: String(q?.question || '').trim() || `Question ${index + 1}`,
          options: fallbackOptions,
          correctAnswer,
          explanation: String(q?.explanation || '').trim(),
        };
      })
      .slice(0, 10);

    res.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('Aptitude test generation error:', error);

    if (isQuotaOrRateLimitError(error)) {
      return res.json({
        success: true,
        fallback: true,
        message: 'AI quota reached. Loaded offline practice set.',
        questions: getFallbackAptitudeQuestions(req.body?.difficulty),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate questions',
      error: error.message,
    });
  }
});

// Score Aptitude Test
router.post('/aptitude-score', verifyToken, async (req, res) => {
  try {
    const { answers, totalQuestions } = req.body;

    if (!answers || !totalQuestions) {
      return res.status(400).json({
        success: false,
        message: 'Answers and total questions are required',
      });
    }

    const score = answers.filter(a => a.isCorrect).length;
    const percentage = Math.round((score / totalQuestions) * 100);

    const defaultFeedback = percentage >= 70
      ? 'Great work. Keep practicing mixed questions daily and focus on speed with accuracy.'
      : percentage >= 50
        ? 'Good attempt. Improve weak areas, revise formulas, and practice timed sets consistently.'
        : 'Keep practicing fundamentals, solve easier sets first, and track mistakes topic-wise.';

    let feedback = defaultFeedback;

    try {
      const feedbackPrompt = [
        `Score: ${score}/${totalQuestions} (${percentage}%).`,
        'Return JSON only: {"feedback":"one short motivational paragraph"}.',
        'Keep under 28 words.',
      ].join('\n');

      const { data: feedbackObject } = await callGemini(feedbackPrompt, { expect: 'object' });
      feedback = String(feedbackObject?.feedback || '').trim() || defaultFeedback;
    } catch (feedbackError) {
      console.warn('Aptitude feedback fallback used:', feedbackError?.message || feedbackError);
    }

    res.json({
      success: true,
      score,
      totalQuestions,
      percentage,
      feedback,
      result: percentage >= 70 ? 'PASS' : percentage >= 50 ? 'AVERAGE' : 'NEEDS IMPROVEMENT'
    });
  } catch (error) {
    console.error('Aptitude scoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to score test',
      error: error.message,
    });
  }
});

// Interview Preparation - Generate Questions
router.post('/interview-prep', verifyToken, async (req, res) => {
  let jobRole = '';
  let jobDescription = '';
  let companyName = '';

  try {
    ({ jobRole = '', jobDescription = '', companyName = '' } = req.body || {});

    if (!jobRole || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Job role and company name are required',
      });
    }

    const shortJobDescription = String(jobDescription || '').slice(0, 350);
    const prompt = [
      `Create 10 interview prep questions for role: ${jobRole}.`,
      `Company: ${companyName}.`,
      shortJobDescription ? `JD: ${shortJobDescription}` : '',
      'Mix: technical, behavioral, company-fit, and problem-solving.',
      'Return JSON array only with keys: question, interviewerGoal, answerStructure, tips.',
      'Keep each field concise (max 30 words).',
    ].filter(Boolean).join('\n');

    const { data: generatedQuestions } = await callGemini(prompt, { expect: 'array' });

    res.json({
      success: true,
      interview: {
        jobRole,
        companyName,
        jobDescription: jobDescription || 'Not provided',
        questions: generatedQuestions.slice(0, 10).map((q, index) => ({
          id: index + 1,
          question: String(q?.question || '').trim() || `Question ${index + 1}`,
          interviewerGoal: String(q?.interviewerGoal || '').trim() || 'Understand your thought process and fit for the role.',
          answerStructure: String(q?.answerStructure || '').trim() || 'Use Situation, Task, Action, Result format with clear impact.',
          tips: String(q?.tips || '').trim() || 'Be specific, quantify impact, and align with company values.',
        }))
      }
    });
  } catch (error) {
    console.error('Interview prep generation error:', error);

    if (isQuotaOrRateLimitError(error)) {
      return res.json({
        success: true,
        fallback: true,
        message: 'AI quota reached. Loaded offline interview preparation set.',
        interview: {
          jobRole,
          companyName,
          jobDescription: jobDescription || 'Not provided',
          questions: getFallbackInterviewQuestions({ jobRole, companyName }),
        },
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate interview questions',
      error: error.message,
    });
  }
});

export default router;
