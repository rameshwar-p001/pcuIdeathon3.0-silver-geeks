import React, { useMemo, useState } from 'react';
import { ChevronLeft, BookOpen, Brain, Briefcase, MessageSquare, Loader, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { apiRequest } from '../lib/api';
import './PlacementTraining.css';

const PlacementTraining = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('resume-builder');
  const [loading, setLoading] = useState(false);

  return (
    <div className="pt-placement-training">
      {/* Header */}
      <div className="pt-header">
        <button className="pt-back-btn" onClick={onBack}>
          <ChevronLeft size={24} />
          <span>Back to Dashboard</span>
        </button>
        <h1 className="pt-title">Placement Training & Preparation</h1>
        <p className="pt-subtitle">Prepare for your placement with AI-powered tools</p>
      </div>

      {/* Tabs Navigation */}
      <div className="pt-tabs-container">
        <div className="pt-tabs">
          <button
            className={`pt-tab ${activeTab === 'resume-builder' ? 'active' : ''}`}
            onClick={() => setActiveTab('resume-builder')}
          >
            <BookOpen size={20} />
            <span>Resume Builder</span>
          </button>
          <button
            className={`pt-tab ${activeTab === 'resume-analyzer' ? 'active' : ''}`}
            onClick={() => setActiveTab('resume-analyzer')}
          >
            <Brain size={20} />
            <span>Resume Analyzer</span>
          </button>
          <button
            className={`pt-tab ${activeTab === 'aptitude' ? 'active' : ''}`}
            onClick={() => setActiveTab('aptitude')}
          >
            <MessageSquare size={20} />
            <span>Aptitude Test</span>
          </button>
          <button
            className={`pt-tab ${activeTab === 'interview' ? 'active' : ''}`}
            onClick={() => setActiveTab('interview')}
          >
            <Briefcase size={20} />
            <span>Interview Prep</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-content">
        {activeTab === 'resume-builder' && <ResumeBuilder loading={loading} setLoading={setLoading} />}
        {activeTab === 'resume-analyzer' && <ResumeAnalyzer loading={loading} setLoading={setLoading} />}
        {activeTab === 'aptitude' && <AptitudeTest loading={loading} setLoading={setLoading} />}
        {activeTab === 'interview' && <InterviewPrep loading={loading} setLoading={setLoading} />}
      </div>
    </div>
  );
};

const normalizeMultilineItems = (value) =>
  String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 5.2) => {
  const lines = doc.splitTextToSize(String(text || ''), maxWidth);
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
};

const addResumeSection = (doc, title, content, y, page) => {
  if (!content) {
    return y;
  }

  const { left, right, top, bottom } = page;
  const maxWidth = page.width - left - right;
  const requiredSpace = 20;

  if (y + requiredSpace > page.height - bottom) {
    doc.addPage();
    y = top;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text(title.toUpperCase(), left, y);
  y += 2.5;

  doc.setDrawColor(219, 39, 119);
  doc.setLineWidth(0.5);
  doc.line(left, y, page.width - right, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(35, 35, 35);

  const items = normalizeMultilineItems(content);
  if (items.length > 1) {
    items.forEach((item) => {
      if (y + 8 > page.height - bottom) {
        doc.addPage();
        y = top;
      }
      doc.text('•', left + 1, y);
      y = addWrappedText(doc, item, left + 6, y, maxWidth - 8);
      y += 1;
    });
  } else {
    y = addWrappedText(doc, content, left, y, maxWidth);
    y += 1;
  }

  return y + 5;
};

const ResumeBuilder = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    experience: '',
    education: '',
    skills: '',
    projects: '',
    certifications: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDownloadPdf = () => {
    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const location = formData.location.trim();

    if (!fullName || !email || !phone || !location) {
      setError('Please fill Full Name, Email, Phone, and Location before downloading PDF resume.');
      return;
    }

    setError('');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const page = {
      width: doc.internal.pageSize.getWidth(),
      height: doc.internal.pageSize.getHeight(),
      left: 16,
      right: 16,
      top: 16,
      bottom: 14,
    };

    let y = page.top;
    const maxWidth = page.width - page.left - page.right;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39);
    y = addWrappedText(doc, fullName, page.left, y, maxWidth, 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(75, 85, 99);
    const contactLine = [email, phone, location].filter(Boolean).join(' | ');
    y = addWrappedText(doc, contactLine, page.left, y + 1, maxWidth);
    y += 2;

    doc.setDrawColor(219, 39, 119);
    doc.setLineWidth(0.7);
    doc.line(page.left, y, page.width - page.right, y);
    y += 7;

    y = addResumeSection(doc, 'Professional Summary', formData.summary, y, page);
    y = addResumeSection(doc, 'Experience', formData.experience, y, page);
    y = addResumeSection(doc, 'Education', formData.education, y, page);
    y = addResumeSection(doc, 'Skills', formData.skills, y, page);
    y = addResumeSection(doc, 'Projects', formData.projects, y, page);
    y = addResumeSection(doc, 'Certifications', formData.certifications, y, page);

    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Generated by Smart Placement Resume Builder', page.left, page.height - 7);

    const fileName = `${fullName.toLowerCase().replace(/\s+/g, '_')}_resume.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="pt-section">
      <h2>AI Resume Builder</h2>
      <p className="pt-section-desc">Create a professional resume with our guided builder</p>

      <div className="pt-resume-form">
        <div className="pt-form-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Your full name"
          />
        </div>

        <div className="pt-form-row">
          <div className="pt-form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
            />
          </div>
          <div className="pt-form-group">
            <label>Phone *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
          <div className="pt-form-group">
            <label>Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="City, State"
            />
          </div>
        </div>

        <div className="pt-form-group">
          <label>Professional Summary</label>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            placeholder="Brief overview of your professional background and skills"
            rows="4"
          />
        </div>

        <div className="pt-form-group">
          <label>Experience</label>
          <textarea
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            placeholder="List your work experience, internships, and achievements"
            rows="4"
          />
        </div>

        <div className="pt-form-group">
          <label>Education</label>
          <textarea
            name="education"
            value={formData.education}
            onChange={handleChange}
            placeholder="Your educational qualifications"
            rows="3"
          />
        </div>

        <div className="pt-form-group">
          <label>Skills</label>
          <textarea
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            placeholder="Technical skills, programming languages, tools (comma separated)"
            rows="3"
          />
        </div>

        <div className="pt-form-group">
          <label>Projects</label>
          <textarea
            name="projects"
            value={formData.projects}
            onChange={handleChange}
            placeholder="Notable projects with brief descriptions"
            rows="3"
          />
        </div>

        <div className="pt-form-group">
          <label>Certifications</label>
          <textarea
            name="certifications"
            value={formData.certifications}
            onChange={handleChange}
            placeholder="Professional certifications and achievements"
            rows="2"
          />
        </div>

        <button className="pt-btn pt-btn-primary" onClick={handleDownloadPdf}>
          Download Professional PDF Resume
        </button>
        {error && <p className="pt-error">{error}</p>}
      </div>
    </div>
  );
};

// Resume Analyzer Component
const ResumeAnalyzer = ({ loading, setLoading }) => {
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  const selectedFileName = useMemo(() => resumeFile?.name || '', [resumeFile]);

  const handleFileSelect = (event) => {
    setError('');
    const file = event.target.files?.[0];

    if (!file) {
      setResumeFile(null);
      return;
    }

    const lowerName = String(file.name || '').toLowerCase();
    const allowed = lowerName.endsWith('.pdf') || lowerName.endsWith('.docx') || lowerName.endsWith('.txt');

    if (!allowed) {
      setResumeFile(null);
      setError('Please upload PDF, DOCX, or TXT resume file.');
      return;
    }

    setResumeFile(file);
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim() && !resumeFile) {
      setError('Please upload resume file or paste resume content.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      let response;

      if (resumeFile) {
        const formData = new FormData();
        formData.append('resumeFile', resumeFile);
        if (resumeText.trim()) {
          formData.append('resumeText', resumeText.trim());
        }

        response = await apiRequest('/api/training/analyze-resume', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await apiRequest('/api/training/analyze-resume', {
          method: 'POST',
          body: JSON.stringify({ resumeText }),
        });
      }

      setAnalysis(response.analysis);
    } catch (err) {
      setError(err.message || 'Failed to analyze resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-section">
      <h2>AI Resume Analyzer</h2>
      <p className="pt-section-desc">Get AI-powered feedback and improve your resume</p>

      <div className="pt-analyzer-container">
        <div className="pt-analyzer-input">
          <label>Upload your resume (PDF, DOCX, TXT):</label>
          <label className="pt-upload-box" htmlFor="resume-file-upload">
            <Upload size={18} />
            <span>{selectedFileName || 'Choose resume file'}</span>
          </label>
          <input
            id="resume-file-upload"
            className="pt-file-input"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
          />

          <label>Or paste resume content:</label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your complete resume content here..."
            rows="8"
          />
          {error && <p className="pt-error">{error}</p>}
          <button
            className="pt-btn pt-btn-primary"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="pt-spinner" />
                Analyzing...
              </>
            ) : (
              'Analyze Resume'
            )}
          </button>
        </div>

        {analysis && (
          <div className="pt-analysis-results">
            <div className="pt-score-card">
              <div className="pt-score-circle">
                {analysis.score}
                <span>/100</span>
              </div>
              <p className="pt-score-label">Overall Score</p>
            </div>

            <div className="pt-analysis-section">
              <h3>✨ Strengths</h3>
              <ul>
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>

            <div className="pt-analysis-section">
              <h3>🎯 Areas for Improvement</h3>
              <ul>
                {analysis.improvements.map((improvement, idx) => (
                  <li key={idx}>{improvement}</li>
                ))}
              </ul>
            </div>

            <div className="pt-analysis-section">
              <h3>💡 Suggestions</h3>
              <ul>
                {analysis.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>

            {analysis.missingSections && analysis.missingSections.length > 0 && (
              <div className="pt-analysis-section">
                <h3>⚠️ Missing Sections</h3>
                <ul>
                  {analysis.missingSections.map((section, idx) => (
                    <li key={idx}>{section}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Aptitude Test Component
const AptitudeTest = ({ loading, setLoading }) => {
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerateQuestions = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await apiRequest('/api/training/aptitude-test', {
        method: 'POST',
        body: JSON.stringify({ difficulty })
      });
      setQuestions(response.questions);
      setAnswers({});
      setSubmitted(false);
      setResult(null);
    } catch (err) {
      setError(err.message || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedOption
    }));
  };

  const handleSubmitTest = async () => {
    setLoading(true);
    try {
      const formattedAnswers = questions.map((q, idx) => ({
        questionId: q.id,
        selected: answers[q.id],
        isCorrect: answers[q.id] === q.correctAnswer
      }));

      const response = await apiRequest('/api/training/aptitude-score', {
        method: 'POST',
        body: JSON.stringify({
          answers: formattedAnswers,
          totalQuestions: questions.length
        })
      });

      setResult(response);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-section">
      <h2>AI Aptitude Test</h2>
      <p className="pt-section-desc">Test your aptitude with AI-generated questions and get instant scoring</p>

      {!questions ? (
        <div className="pt-difficulty-selector">
          <label>Select Difficulty Level:</label>
          <div className="pt-difficulty-buttons">
            {['easy', 'medium', 'hard'].map((level) => (
              <button
                key={level}
                className={`pt-difficulty-btn ${difficulty === level ? 'active' : ''}`}
                onClick={() => setDifficulty(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          {error && <p className="pt-error">{error}</p>}
          <button
            className="pt-btn pt-btn-primary"
            onClick={handleGenerateQuestions}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="pt-spinner" />
                Generating...
              </>
            ) : (
              'Start Test'
            )}
          </button>
        </div>
      ) : submitted && result ? (
        <div className="pt-test-result">
          <div className="pt-result-header">
            <div className="pt-result-score">
              <div className="pt-score-circle">
                {result.percentage}
                <span>%</span>
              </div>
            </div>
            <div className="pt-result-info">
              <p className={`pt-result-status pt-status-${result.result.toLowerCase().replace(' ', '-')}`}>
                {result.result}
              </p>
              <p className="pt-result-details">
                You scored {result.score} out of {result.totalQuestions}
              </p>
            </div>
          </div>

          <div className="pt-result-feedback">
            <h3>Feedback</h3>
            <p>{result.feedback}</p>
          </div>

          <button
            className="pt-btn pt-btn-secondary"
            onClick={handleGenerateQuestions}
          >
            Take Test Again
          </button>
        </div>
      ) : (
        <div className="pt-test-container">
          <div className="pt-legend-row">
            <span><strong>MCQ Format:</strong> 10 questions, one correct option each</span>
            <span><strong>Difficulty:</strong> {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
          </div>

          <div className="pt-question-nav">
            {questions.map((question, idx) => {
              const answered = Boolean(answers[question.id]);
              return (
                <button
                  key={question.id}
                  type="button"
                  className={`pt-question-chip ${answered ? 'answered' : ''}`}
                  onClick={() => {
                    const element = document.getElementById(`pt-question-${question.id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  Q{idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-test-progress">
            <p>Question Progress</p>
            <div className="pt-progress-bar">
              <div
                className="pt-progress-fill"
                style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              ></div>
            </div>
            <p className="pt-progress-text">
              {Object.keys(answers).length} / {questions.length} answered
            </p>
          </div>

          <div className="pt-questions-list">
            {questions.map((question, idx) => (
              <div key={question.id} id={`pt-question-${question.id}`} className="pt-question-card">
                <h3>Q{idx + 1}. {question.question}</h3>
                <div className="pt-options">
                  {question.options.map((option, optIdx) => (
                    <label key={optIdx} className={`pt-option ${answers[question.id] === option ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => handleAnswerChange(question.id, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="pt-error">{error}</p>}
          <button
            className="pt-btn pt-btn-primary"
            onClick={handleSubmitTest}
            disabled={Object.keys(answers).length !== questions.length || loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="pt-spinner" />
                Submitting...
              </>
            ) : (
              'Submit Test'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// Interview Preparation Component
const InterviewPrep = ({ loading, setLoading }) => {
  const [formData, setFormData] = useState({
    jobRole: '',
    companyName: '',
    jobDescription: ''
  });
  const [questions, setQuestions] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateQuestions = async () => {
    if (!formData.jobRole || !formData.companyName) {
      setError('Please fill in job role and company name');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await apiRequest('/api/training/interview-prep', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setQuestions(response.interview);
    } catch (err) {
      setError(err.message || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-section">
      <h2>Interview Preparation</h2>
      <p className="pt-section-desc">Get 10 most important interview questions tailored to your target role</p>

      {!questions ? (
        <div className="pt-interview-form">
          <div className="pt-form-group">
            <label>Job Role *</label>
            <input
              type="text"
              name="jobRole"
              value={formData.jobRole}
              onChange={handleInputChange}
              placeholder="e.g., Software Engineer, Data Analyst"
            />
          </div>

          <div className="pt-form-group">
            <label>Company Name *</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder="e.g., Google, Microsoft"
            />
          </div>

          <div className="pt-form-group">
            <label>Job Description (Optional)</label>
            <textarea
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleInputChange}
              placeholder="Paste the job description to get more tailored questions"
              rows="6"
            />
          </div>

          {error && <p className="pt-error">{error}</p>}

          <button
            className="pt-btn pt-btn-primary"
            onClick={handleGenerateQuestions}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="pt-spinner" />
                Generating Questions...
              </>
            ) : (
              'Generate Interview Questions'
            )}
          </button>
        </div>
      ) : (
        <div className="pt-interview-results">
          <div className="pt-interview-header">
            <h3>{questions.jobRole} at {questions.companyName}</h3>
            <button
              className="pt-btn pt-btn-secondary"
              onClick={() => setQuestions(null)}
            >
              Generate New Questions
            </button>
          </div>

          <div className="pt-questions-accordion">
            {questions.questions.map((question, idx) => (
              <div
                key={question.id}
                className={`pt-accordion-item ${expandedQuestion === question.id ? 'expanded' : ''}`}
              >
                <div
                  className="pt-accordion-header"
                  onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                >
                  <span className="pt-q-number">Q{idx + 1}</span>
                  <span className="pt-q-text">{question.question}</span>
                </div>

                {expandedQuestion === question.id && (
                  <div className="pt-accordion-content">
                    <div className="pt-content-section">
                      <h4>What the Interviewer Wants to Know:</h4>
                      <p>{question.interviewerGoal}</p>
                    </div>

                    <div className="pt-content-section">
                      <h4>How to Structure Your Answer:</h4>
                      <p>{question.answerStructure}</p>
                    </div>

                    <div className="pt-content-section">
                      <h4>Tips & Examples:</h4>
                      <p>{question.tips}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementTraining;
