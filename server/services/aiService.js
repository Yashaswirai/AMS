import { GoogleGenerativeAI } from '@google/generative-ai';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import { computeOverview, computeStudentStats } from './analyticsService.js';
import { ATTENDANCE_THRESHOLDS } from '../utils/constants.js';

let genAI = null;

const getGenAI = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-pro'
];

const getModel = (modelName = 'gemini-1.5-flash-latest') => {
  return getGenAI().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    safetySettings: [],
  });
};

/**
 * Execute content generation with model candidate fallback
 */
const generateWithModelFallback = async (promptFn) => {
  let lastError = null;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = getModel(modelName);
      return await promptFn(model);
    } catch (err) {
      lastError = err;
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        console.warn(`Gemini model ${modelName} not found, trying next candidate...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

/**
 * Build a context-rich system prompt with real data
 */
export const buildSystemPrompt = async (role = 'admin') => {
  const overview = await computeOverview();

  return `You are an AI assistant for FRAMS (Face Recognition Attendance Management System), an intelligent attendance management platform used by educational institutions.

SYSTEM CONTEXT:
- Total Students: ${overview.totalStudents}
- Total Teachers: ${overview.totalTeachers}
- Total Subjects: ${overview.totalSubjects}
- Today's Attendance: ${overview.todayAttendance.percentage.toFixed(1)}% (${overview.todayAttendance.present}/${overview.todayAttendance.total})
- Overall Average Attendance: ${overview.avgAttendance.toFixed(1)}%
- At-Risk Students (below ${ATTENDANCE_THRESHOLDS.MINIMUM}%): ${overview.atRiskStudents}
- Attendance Threshold: ${ATTENDANCE_THRESHOLDS.MINIMUM}%

USER ROLE: ${role}

You can help with:
- Analyzing attendance patterns and trends
- Identifying at-risk students
- Generating attendance reports and summaries
- Providing actionable recommendations
- Explaining attendance policies
- Predicting future attendance trends

Be concise, professional, and data-driven. Always reference actual system data when available.`;
};

/**
 * Build student-specific context prompt
 */
export const buildStudentPrompt = async (studentId) => {
  const stats = await computeStudentStats(studentId);
  const student = await Student.findById(studentId)
    .populate('user', 'name email')
    .populate('department', 'name')
    .populate('course', 'name')
    .lean();

  return `Student: ${student?.user?.name || 'Unknown'}
Roll: ${student?.rollNumber || 'N/A'}
Department: ${student?.department?.name || 'N/A'}
Course: ${student?.course?.name || 'N/A'}
Semester: ${student?.semester || 'N/A'}
Overall Attendance: ${stats.overall.percentage}%
At Risk: ${stats.overall.percentage < ATTENDANCE_THRESHOLDS.MINIMUM ? 'YES' : 'NO'}

Subject-wise:
${stats.subjects.map((s) => `- ${s.subjectName}: ${s.percentage}% (${s.presentClasses}/${s.totalClasses})`).join('\n')}`;
};

/**
 * Call Gemini API with a chat message
 */
export const callGeminiChat = async (message, history = [], role = 'admin', studentId = null) => {
  let systemContext = await buildSystemPrompt(role);
  if (studentId) {
    const studentContext = await buildStudentPrompt(studentId);
    systemContext += `\n\nSPECIFIC STUDENT DATA:\n${studentContext}`;
  }

  try {
    return await generateWithModelFallback(async (model) => {
      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: `System: ${systemContext}` }],
          },
          {
            role: 'model',
            parts: [{ text: 'Understood. I am ready to assist with attendance management insights and analysis.' }],
          },
          ...history.map((h) => ({
            role: h.role,
            parts: [{ text: h.content }],
          })),
        ],
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    });
  } catch (err) {
    console.warn('Gemini chat unavailable, returning real database context analysis:', err.message);
    const overview = await computeOverview();
    return `[Database Insight] Total enrolled students: ${overview.totalStudents}, Overall Attendance: ${overview.avgAttendance.toFixed(1)}%, At-Risk Students: ${overview.atRiskStudents}. Gemini AI service is currently offline or unconfigured.`;
  }
};

/**
 * Generate AI-powered attendance report
 */
export const generateAIReport = async (params = {}) => {
  const { reportType = 'general', filters = {}, role = 'admin' } = params;

  const overview = await computeOverview();
  const systemContext = await buildSystemPrompt(role);

  let prompt = `${systemContext}

Generate a comprehensive ${reportType} attendance report with the following structure:

1. EXECUTIVE SUMMARY
   - Overall attendance situation
   - Key metrics and KPIs

2. KEY FINDINGS
   - Notable trends and patterns
   - Departments/subjects with highest/lowest attendance

3. AT-RISK ANALYSIS
   - Students below ${ATTENDANCE_THRESHOLDS.MINIMUM}% threshold
   - Risk categorization

4. RECOMMENDATIONS
   - Actionable steps for improvement
   - Prioritized interventions

5. PREDICTIONS
   - Expected attendance trends for next month

Weekly Trend Data:
${overview.weeklyTrend.map((d) => `${d.dayName} ${d.date}: ${d.percentage}%`).join('\n')}

Format the report professionally with clear sections, bullet points, and data-backed insights.`;

  try {
    return await generateWithModelFallback(async (model) => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  } catch (err) {
    console.warn('Gemini report generation unavailable, outputting real database summary report:', err.message);
    return `# Executive Attendance Report (${new Date().toLocaleDateString()})

## 1. Executive Summary
- Total Enrolled Students: ${overview.totalStudents}
- Total Active Teachers: ${overview.totalTeachers}
- Total Registered Subjects: ${overview.totalSubjects}
- Overall System Attendance Average: ${overview.avgAttendance.toFixed(1)}%

## 2. At-Risk Analysis
- At-Risk Students (Below ${ATTENDANCE_THRESHOLDS.MINIMUM}%): ${overview.atRiskStudents}

## 3. Today's Summary
- Today's Attendance Rate: ${overview.todayAttendance.percentage.toFixed(1)}% (${overview.todayAttendance.present}/${overview.todayAttendance.total} present)`;
  }
};

/**
 * Generate automated insights
 */
export const generateInsights = async (role = 'admin') => {
  const overview = await computeOverview();

  try {
    const text = await generateWithModelFallback(async (model) => {
      const prompt = `Based on this attendance system data, generate 5-7 specific, actionable insights:

Stats:
- Overall Attendance: ${overview.avgAttendance.toFixed(1)}%
- Today's Attendance: ${overview.todayAttendance.percentage.toFixed(1)}%
- At-Risk Students: ${overview.atRiskStudents} out of ${overview.totalStudents}
- Weekly Trend: ${overview.weeklyTrend.map((d) => `${d.dayName}: ${d.percentage}%`).join(', ')}

For each insight provide:
1. A clear title
2. The observation
3. Impact level (high/medium/low)
4. A specific recommendation

Format as JSON array with structure: [{ title, observation, impact, recommendation }]
Return ONLY valid JSON, no markdown.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    });

    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonText);
  } catch (err) {
    console.warn('Gemini Insights unavailable, computing real MongoDB statistical insights:', err.message);
    
    // Return REAL MongoDB database-driven insights cleanly (NO false/mock data)
    const insights = [];

    if (overview.atRiskStudents > 0) {
      insights.push({
        title: 'At-Risk Attendance Alert',
        observation: `${overview.atRiskStudents} out of ${overview.totalStudents} students currently fall below the required ${ATTENDANCE_THRESHOLDS.MINIMUM}% attendance threshold.`,
        impact: 'high',
        recommendation: 'Issue automated warnings and schedule academic counseling for affected students.'
      });
    }

    insights.push({
      title: "Today's Attendance Performance",
      observation: `Today's check-in rate is ${overview.todayAttendance.percentage.toFixed(1)}% (${overview.todayAttendance.present} present out of ${overview.todayAttendance.total} total enrolled).`,
      impact: overview.todayAttendance.percentage < 75 ? 'high' : 'medium',
      recommendation: 'Monitor morning period roll calls and verify active live QR/Face sessions.'
    });

    insights.push({
      title: 'Institutional Average',
      observation: `System-wide average attendance across all ${overview.totalSubjects} subjects is ${overview.avgAttendance.toFixed(1)}%.`,
      impact: 'low',
      recommendation: 'Track course-level distribution charts to maintain consistent performance.'
    });

    return insights;
  }
};

/**
 * Parse and validate Gemini response
 */
export const parseGeminiResponse = (text) => {
  return {
    content: text,
    wordCount: text.split(' ').length,
    timestamp: new Date().toISOString(),
  };
};
