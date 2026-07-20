import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { callGeminiChat, generateAIReport, generateInsights, parseGeminiResponse } from '../services/aiService.js';
import Student from '../models/Student.js';

/**
 * POST /api/v1/ai/chat
 */
export const chat = asyncHandler(async (req, res) => {
  const { message: rawMessage, prompt, history = [], studentId } = req.body;
  const message = rawMessage || prompt;

  if (!message) {
    throw ApiError.badRequest('Message is required');
  }

  let resolvedStudentId = studentId;

  // If the requester is a student, restrict chat context to their own ID
  if (req.user.role === 'student') {
    const student = await Student.findOne({ user: req.user.id });
    if (!student) throw ApiError.notFound('Student profile not found');
    resolvedStudentId = student._id;
  }

  try {
    const reply = await callGeminiChat(
      message,
      history,
      req.user.role,
      resolvedStudentId
    );

    const parsedResponse = parseGeminiResponse(reply);
    return new ApiResponse(200, parsedResponse, 'AI response generated').send(res);
  } catch (error) {
    throw ApiError.internal(`AI service failed: ${error.message}`);
  }
});

/**
 * POST /api/v1/ai/report
 */
export const generateReport = asyncHandler(async (req, res) => {
  const { reportType = 'general', filters = {} } = req.body;

  try {
    const reportText = await generateAIReport({
      reportType,
      filters,
      role: req.user.role,
    });

    const parsedResponse = parseGeminiResponse(reportText);
    return new ApiResponse(200, parsedResponse, 'AI report generated successfully').send(res);
  } catch (error) {
    throw ApiError.internal(`AI report generation failed: ${error.message}`);
  }
});

/**
 * GET /api/v1/ai/insights
 */
export const getInsights = asyncHandler(async (req, res) => {
  try {
    const insights = await generateInsights(req.user.role);
    return new ApiResponse(200, insights, 'AI insights fetched successfully').send(res);
  } catch (error) {
    throw ApiError.internal(`AI insights generation failed: ${error.message}`);
  }
});
