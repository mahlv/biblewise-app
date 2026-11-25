import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalAction, internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { MEETING_TYPES, recordingStatusValidator, recordingSummaryValidator } from './schema';
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, parseSummary } from '../lib/recordingSummary';
import {
  appError,
  DEFAULT_SUMMARY_LANGUAGE,
  isSummaryLanguage,
  SUMMARY_LANGUAGES,
  type PipelineErrorCode,
  type SummaryLanguage,
} from '../lib/serverErrors';

/**
 * Recorded messages: upload -> Groq Whisper transcript -> DeepSeek summary.
 *
 * Security model (the app has no login yet): every public function takes the
 * device `anonymousId` and checks that it belongs to an onboarded user and, for
 * a given recording, that it owns the document. The pipeline actions are
 * internal, so they can only be started by the validated mutations below —
 * nobody can call the paid APIs directly.
 * TODO(clerk): derive the user from `ctx.auth` instead of the client-supplied id.
 */

const MAX_RECORDINGS_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FIELD_LENGTH = 120;
const MAX_TRANSCRIPT_CHARS = 180_000;

// Convex injects `process.env` at runtime; declared here to avoid depending on @types/node.
declare const process: { env: Record<string, string | undefined> };

type Ctx = QueryCtx | MutationCtx;

async function requireUser(ctx: Ctx, anonymousId: string): Promise<Doc<'users'>> {
  const user = await ctx.db
    .query('users')
    .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', anonymousId))
    .unique();
  if (!user || !user.onboardingCompleted) throw appError('userNotFound');
  return user;
}

async function requireOwnedRecording(ctx: Ctx, anonymousId: string, recordingId: Id<'recordings'>) {
  const recording = await ctx.db.get('recordings', recordingId);
  if (!recording || recording.anonymousId !== anonymousId) throw appError('recordingNotFound');
  return recording;
}

async function countRecentRecordings(ctx: Ctx, anonymousId: string): Promise<number> {
  const since = Date.now() - DAY_MS;
  const recent = await ctx.db
    .query('recordings')
    .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', anonymousId))
    .order('desc')
    .take(MAX_RECORDINGS_PER_DAY + 1);
  return recent.filter((item) => item.createdAt >= since).length;
}

function cleanField(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_FIELD_LENGTH) : undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const generateUploadUrl = mutation({
  args: { anonymousId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.anonymousId);
    if ((await countRecentRecordings(ctx, args.anonymousId)) >= MAX_RECORDINGS_PER_DAY) {
      throw appError('dailyRecordingLimit');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const createRecording = mutation({
  args: {
    anonymousId: v.string(),
    audioStorageId: v.id('_storage'),
    durationSeconds: v.number(),
    /** App language (`SUMMARY_LANGUAGES`); the summary is written in it. Unknown values mean Portuguese. */
    language: v.optional(v.string()),
  },
  returns: v.id('recordings'),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);

    if (!Number.isFinite(args.durationSeconds) || args.durationSeconds < 1 || args.durationSeconds > MAX_RECORDING_SECONDS) {
      throw appError('recordingDurationInvalid');
    }
    if ((await countRecentRecordings(ctx, args.anonymousId)) >= MAX_RECORDINGS_PER_DAY) {
      throw appError('dailyRecordingLimit');
    }

    const file = await ctx.db.system.get('_storage', args.audioStorageId);
    if (!file) throw appError('audioNotFound');
    if (file.size > MAX_AUDIO_BYTES) {
      await ctx.storage.delete(args.audioStorageId);
      throw appError('audioTooLarge');
    }

    const now = Date.now();
    const recordingId = await ctx.db.insert('recordings', {
      userId: user._id,
      anonymousId: args.anonymousId,
      status: 'uploading',
      progress: 5,
      audioStorageId: args.audioStorageId,
      durationSeconds: Math.round(args.durationSeconds),
      meetingType: MEETING_TYPES[0],
      language: isSummaryLanguage(args.language) ? args.language : DEFAULT_SUMMARY_LANGUAGE,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.recordings.transcribeAndSummarize, { recordingId });
    return recordingId;
  },
});

export const updateRecordingMetadata = mutation({
  args: {
    anonymousId: v.string(),
    recordingId: v.id('recordings'),
    church: v.optional(v.string()),
    preacher: v.optional(v.string()),
    meetingType: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwnedRecording(ctx, args.anonymousId, args.recordingId);
    const patch: Partial<Doc<'recordings'>> = { updatedAt: Date.now() };
    if (args.church !== undefined) patch.church = cleanField(args.church);
    if (args.preacher !== undefined) patch.preacher = cleanField(args.preacher);
    if (args.meetingType !== undefined) {
      if (!(MEETING_TYPES as readonly string[]).includes(args.meetingType)) throw appError('meetingTypeInvalid');
      patch.meetingType = args.meetingType;
    }
    await ctx.db.patch('recordings', args.recordingId, patch);
    return null;
  },
});

const recordingViewValidator = v.object({
  _id: v.id('recordings'),
  _creationTime: v.number(),
  title: v.optional(v.string()),
  status: recordingStatusValidator,
  progress: v.number(),
  durationSeconds: v.number(),
  summary: v.optional(recordingSummaryValidator),
  transcript: v.optional(v.string()),
  error: v.optional(v.string()),
  church: v.optional(v.string()),
  preacher: v.optional(v.string()),
  meetingType: v.optional(v.string()),
  createdAt: v.number(),
  audioUrl: v.union(v.string(), v.null()),
});

export const getRecording = query({
  args: { anonymousId: v.string(), recordingId: v.id('recordings') },
  returns: v.union(recordingViewValidator, v.null()),
  handler: async (ctx, args) => {
    const recording = await ctx.db.get('recordings', args.recordingId);
    if (!recording || recording.anonymousId !== args.anonymousId) return null;
    return {
      _id: recording._id,
      _creationTime: recording._creationTime,
      title: recording.title,
      status: recording.status,
      progress: recording.progress,
      durationSeconds: recording.durationSeconds,
      summary: recording.summary,
      transcript: recording.transcript,
      error: recording.error,
      church: recording.church,
      preacher: recording.preacher,
      meetingType: recording.meetingType,
      createdAt: recording.createdAt,
      audioUrl: await ctx.storage.getUrl(recording.audioStorageId),
    };
  },
});

export const listUserRecordings = query({
  args: { anonymousId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id('recordings'),
      title: v.optional(v.string()),
      status: recordingStatusValidator,
      durationSeconds: v.number(),
      preacher: v.optional(v.string()),
      church: v.optional(v.string()),
      theme: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 30), 1), 50);
    const rows = await ctx.db
      .query('recordings')
      .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', args.anonymousId))
      .order('desc')
      .take(limit);
    return rows.map((row) => ({
      _id: row._id,
      title: row.summary?.title ?? row.title,
      status: row.status,
      durationSeconds: row.durationSeconds,
      preacher: row.preacher,
      church: row.church,
      theme: row.summary?.theme,
      createdAt: row.createdAt,
    }));
  },
});

/** Most recent recording of the device, for the Home "Últimas Memórias" card. */
export const getLatestRecording = query({
  args: { anonymousId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('recordings'),
      title: v.optional(v.string()),
      status: recordingStatusValidator,
      durationSeconds: v.number(),
      preacher: v.optional(v.string()),
      church: v.optional(v.string()),
      meetingType: v.optional(v.string()),
      keyPoints: v.array(v.string()),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recordings')
      .withIndex('by_anonymous_id', (q) => q.eq('anonymousId', args.anonymousId))
      .order('desc')
      .first();
    if (!row) return null;
    return {
      _id: row._id,
      title: row.summary?.title ?? row.title,
      status: row.status,
      durationSeconds: row.durationSeconds,
      preacher: row.preacher,
      church: row.church,
      meetingType: row.meetingType,
      keyPoints: (row.summary?.centralPoints ?? []).slice(0, 3).map((point) => point.title),
      createdAt: row.createdAt,
    };
  },
});

export const retryRecording = mutation({
  args: { anonymousId: v.string(), recordingId: v.id('recordings'), language: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recording = await requireOwnedRecording(ctx, args.anonymousId, args.recordingId);
    if (recording.status !== 'failed') return null;
    await ctx.db.patch('recordings', args.recordingId, {
      status: 'uploading',
      progress: 5,
      error: undefined,
      // The user may have changed the app language since the failure.
      ...(isSummaryLanguage(args.language) ? { language: args.language } : {}),
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.recordings.transcribeAndSummarize, { recordingId: args.recordingId });
    return null;
  },
});

export const deleteRecording = mutation({
  args: { anonymousId: v.string(), recordingId: v.id('recordings') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recording = await requireOwnedRecording(ctx, args.anonymousId, args.recordingId);
    await ctx.storage.delete(recording.audioStorageId);
    await ctx.db.delete('recordings', args.recordingId);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: pipeline state + action
// ---------------------------------------------------------------------------

export const getForPipeline = internalMutation({
  args: { recordingId: v.id('recordings') },
  returns: v.union(
    v.object({ audioUrl: v.string(), church: v.optional(v.string()), preacher: v.optional(v.string()), language: v.string() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const recording = await ctx.db.get('recordings', args.recordingId);
    if (!recording) return null;
    const audioUrl = await ctx.storage.getUrl(recording.audioStorageId);
    if (!audioUrl) return null;
    await ctx.db.patch('recordings', args.recordingId, { status: 'transcribing', progress: 10, error: undefined, updatedAt: Date.now() });
    const language = isSummaryLanguage(recording.language) ? recording.language : DEFAULT_SUMMARY_LANGUAGE;
    return { audioUrl, church: recording.church, preacher: recording.preacher, language };
  },
});

export const saveTranscript = internalMutation({
  args: { recordingId: v.id('recordings'), transcript: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch('recordings', args.recordingId, {
      transcript: args.transcript,
      status: 'summarizing',
      progress: 60,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const saveResult = internalMutation({
  args: { recordingId: v.id('recordings'), summary: recordingSummaryValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch('recordings', args.recordingId, {
      summary: args.summary,
      title: args.summary.title,
      status: 'completed',
      progress: 100,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: { recordingId: v.id('recordings'), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recording = await ctx.db.get('recordings', args.recordingId);
    if (!recording) return null;
    await ctx.db.patch('recordings', args.recordingId, { status: 'failed', error: args.message, updatedAt: Date.now() });
    return null;
  },
});

/** The summary is written in the app language the recording was made in (Portuguese when unknown). */
function summarySystemPrompt(language: SummaryLanguage): string {
  const languageName = SUMMARY_LANGUAGES[language];
  return `You are an assistant that organizes Christian pastoral messages.
You receive the transcript of a sermon and reply ONLY with a valid JSON object, with no text outside the JSON, in exactly this format:
{
  "title": "short, inspiring title of the message",
  "theme": "central theme in one sentence",
  "centralPoints": [{"title": "point", "description": "explanation in 1-3 sentences"}],
  "scripturesCited": [{"reference": "John 3:16", "text": "text of the verse as it was quoted, or empty"}],
  "practicalTopics": ["short practical application"],
  "impactQuote": "the most impactful sentence said in the message"
}
Rules: use only what is in the transcript, do not invent verses; 3 to 6 central points; 3 to 5 practical topics; keep the JSON keys exactly as shown; write ALL the text values in ${languageName}, whatever language the sermon was preached in (write Bible references the way they are written in ${languageName}).`;
}

class PipelineError extends Error {
  constructor(readonly code: PipelineErrorCode) {
    super(code);
  }
}

/**
 * Both calls only expose a generic reason to the user; details stay in server logs (never keys or transcripts).
 * Speech language: Portuguese is hinted for Portuguese users (as before); otherwise the model detects it,
 * because the app language says nothing about the language of the sermon.
 */
async function transcribeWithGroq(audioUrl: string, apiKey: string, language: SummaryLanguage): Promise<string> {
  const form = new FormData();
  form.append('model', 'whisper-large-v3-turbo');
  if (language === 'pt-BR') form.append('language', 'pt');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  form.append('url', audioUrl);

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    console.error('Groq transcription failed', response.status);
    throw new PipelineError('transcribeFailed');
  }
  const data = (await response.json()) as { text?: unknown };
  const transcript = typeof data.text === 'string' ? data.text.trim() : '';
  if (!transcript) throw new PipelineError('noSpeech');
  return transcript;
}

async function summarizeWithDeepSeek(transcript: string, apiKey: string, context: string, language: SummaryLanguage) {
  const body = JSON.stringify({
    model: 'deepseek-chat',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: summarySystemPrompt(language) },
      { role: 'user', content: `${context}Transcript:\n${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}` },
    ],
  });

  // One retry: the model occasionally returns malformed JSON.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) {
      console.error('DeepSeek summary failed', response.status);
      continue;
    }
    const data = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = data.choices?.[0]?.message?.content;
    const summary = typeof content === 'string' ? parseSummary(content) : null;
    if (summary) return summary;
  }
  throw new PipelineError('summaryFailed');
}

/** Keys come from Convex env vars: `npx convex env set GROQ_API_KEY ...` / `DEEPSEEK_API_KEY`. */
export const transcribeAndSummarize = internalAction({
  args: { recordingId: v.id('recordings') },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const groqKey = process.env.GROQ_API_KEY;
      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      if (!groqKey || !deepseekKey) {
        console.error('Missing GROQ_API_KEY or DEEPSEEK_API_KEY');
        throw new PipelineError('notConfigured');
      }

      const recording = await ctx.runMutation(internal.recordings.getForPipeline, { recordingId: args.recordingId });
      if (!recording) return null;
      const language = recording.language as SummaryLanguage;

      const transcript = await transcribeWithGroq(recording.audioUrl, groqKey, language);
      await ctx.runMutation(internal.recordings.saveTranscript, { recordingId: args.recordingId, transcript });

      const context = [
        recording.preacher ? `Preacher: ${recording.preacher}\n` : '',
        recording.church ? `Church: ${recording.church}\n` : '',
      ].join('');
      const summary = await summarizeWithDeepSeek(transcript, deepseekKey, context, language);
      await ctx.runMutation(internal.recordings.saveResult, { recordingId: args.recordingId, summary });
    } catch (error) {
      // The stored value is a code; the app translates it into the user's language.
      const message: PipelineErrorCode = error instanceof PipelineError ? error.code : 'unexpected';
      if (!(error instanceof PipelineError)) console.error('Recording pipeline error', error instanceof Error ? error.name : 'unknown');
      await ctx.runMutation(internal.recordings.markFailed, { recordingId: args.recordingId, message });
    }
    return null;
  },
});
