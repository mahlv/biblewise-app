import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalAction, internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { MEETING_TYPES, recordingStatusValidator, recordingSummaryValidator } from './schema';
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, parseSummary } from '../lib/recordingSummary';

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
  if (!user || !user.onboardingCompleted) throw new Error('Usuário não encontrado.');
  return user;
}

async function requireOwnedRecording(ctx: Ctx, anonymousId: string, recordingId: Id<'recordings'>) {
  const recording = await ctx.db.get('recordings', recordingId);
  if (!recording || recording.anonymousId !== anonymousId) throw new Error('Gravação não encontrada.');
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
      throw new Error('Limite diário de gravações atingido. Tente novamente amanhã.');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const createRecording = mutation({
  args: {
    anonymousId: v.string(),
    audioStorageId: v.id('_storage'),
    durationSeconds: v.number(),
  },
  returns: v.id('recordings'),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.anonymousId);

    if (!Number.isFinite(args.durationSeconds) || args.durationSeconds < 1 || args.durationSeconds > MAX_RECORDING_SECONDS) {
      throw new Error('Duração de gravação inválida (máximo 2 horas).');
    }
    if ((await countRecentRecordings(ctx, args.anonymousId)) >= MAX_RECORDINGS_PER_DAY) {
      throw new Error('Limite diário de gravações atingido. Tente novamente amanhã.');
    }

    const file = await ctx.db.system.get('_storage', args.audioStorageId);
    if (!file) throw new Error('Áudio não encontrado.');
    if (file.size > MAX_AUDIO_BYTES) {
      await ctx.storage.delete(args.audioStorageId);
      throw new Error('O áudio é grande demais (máximo 25 MB).');
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
      if (!(MEETING_TYPES as readonly string[]).includes(args.meetingType)) throw new Error('Tipo de reunião inválido.');
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

export const retryRecording = mutation({
  args: { anonymousId: v.string(), recordingId: v.id('recordings') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recording = await requireOwnedRecording(ctx, args.anonymousId, args.recordingId);
    if (recording.status !== 'failed') return null;
    await ctx.db.patch('recordings', args.recordingId, {
      status: 'uploading',
      progress: 5,
      error: undefined,
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
  returns: v.union(v.object({ audioUrl: v.string(), church: v.optional(v.string()), preacher: v.optional(v.string()) }), v.null()),
  handler: async (ctx, args) => {
    const recording = await ctx.db.get('recordings', args.recordingId);
    if (!recording) return null;
    const audioUrl = await ctx.storage.getUrl(recording.audioStorageId);
    if (!audioUrl) return null;
    await ctx.db.patch('recordings', args.recordingId, { status: 'transcribing', progress: 10, error: undefined, updatedAt: Date.now() });
    return { audioUrl, church: recording.church, preacher: recording.preacher };
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

const SUMMARY_SYSTEM_PROMPT = `Você é um assistente que organiza mensagens pastorais cristãs em português do Brasil.
Receba a transcrição de uma pregação e responda APENAS com um objeto JSON válido, sem texto fora do JSON, exatamente neste formato:
{
  "title": "título curto e inspirador da mensagem",
  "theme": "tema central em uma frase",
  "centralPoints": [{"title": "ponto", "description": "explicação em 1-3 frases"}],
  "scripturesCited": [{"reference": "João 3:16", "text": "texto do versículo como foi citado, ou vazio"}],
  "practicalTopics": ["aplicação prática curta"],
  "impactQuote": "a frase de maior impacto dita na mensagem"
}
Regras: use apenas o que está na transcrição, não invente versículos; 3 a 6 pontos centrais; 3 a 5 tópicos práticos; todos os textos em português.`;

class PipelineError extends Error {}

/** Both calls only expose a generic reason to the user; details stay in server logs (never keys or transcripts). */
async function transcribeWithGroq(audioUrl: string, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'pt');
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
    throw new PipelineError('Não foi possível transcrever o áudio. Tente novamente.');
  }
  const data = (await response.json()) as { text?: unknown };
  const transcript = typeof data.text === 'string' ? data.text.trim() : '';
  if (!transcript) throw new PipelineError('Não detectamos fala na gravação.');
  return transcript;
}

async function summarizeWithDeepSeek(transcript: string, apiKey: string, context: string) {
  const body = JSON.stringify({
    model: 'deepseek-chat',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: `${context}Transcrição:\n${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}` },
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
  throw new PipelineError('Não foi possível gerar o resumo. Tente novamente.');
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
        throw new PipelineError('O serviço de resumo ainda não está configurado.');
      }

      const recording = await ctx.runMutation(internal.recordings.getForPipeline, { recordingId: args.recordingId });
      if (!recording) return null;

      const transcript = await transcribeWithGroq(recording.audioUrl, groqKey);
      await ctx.runMutation(internal.recordings.saveTranscript, { recordingId: args.recordingId, transcript });

      const context = [
        recording.preacher ? `Pregador(a): ${recording.preacher}\n` : '',
        recording.church ? `Igreja: ${recording.church}\n` : '',
      ].join('');
      const summary = await summarizeWithDeepSeek(transcript, deepseekKey, context);
      await ctx.runMutation(internal.recordings.saveResult, { recordingId: args.recordingId, summary });
    } catch (error) {
      const message = error instanceof PipelineError ? error.message : 'Ocorreu um erro inesperado. Tente novamente.';
      if (!(error instanceof PipelineError)) console.error('Recording pipeline error', error instanceof Error ? error.name : 'unknown');
      await ctx.runMutation(internal.recordings.markFailed, { recordingId: args.recordingId, message });
    }
    return null;
  },
});
