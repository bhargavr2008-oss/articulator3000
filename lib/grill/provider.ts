import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  GRILL_QUESTION_CAP,
  GRILL_QUESTION_MIN,
  lowestConfidenceField,
  shouldStopGrill,
} from "./core";
import {
  grillTurnResultSchema,
  type FoundationalField,
  type GrillQuestion,
  type GrillTurnRequest,
  type GrillTurnResult,
} from "./schema";
import { ideaModelSchema } from "@/lib/synthesis/schema";

const FALLBACK_QUESTIONS: Record<FoundationalField, string> = {
  title: "What name best captures this idea without needing extra explanation?",
  oneLiner:
    "How would you explain the idea to a teammate in one concrete sentence?",
  summary:
    "What is the most important detail someone would miss from the current summary?",
  problem: "What painful problem happens today, and how often does it happen?",
  targetUser:
    "Who feels this problem most strongly, in what specific situation?",
  solution: "What does the product actually do that resolves the problem?",
  coreWorkflow:
    "Walk me through the exact steps from starting the product to getting the result.",
  differentiator:
    "Why would someone use this instead of the closest existing alternative?",
  desiredOutcome: "What observable result tells the user this worked?",
};

function fallbackQuestion(
  idea: GrillTurnRequest["idea"],
  questionCount: number,
): GrillQuestion {
  const field = lowestConfidenceField(idea);
  return {
    field,
    question:
      questionCount > 1
        ? `Go one level deeper: ${FALLBACK_QUESTIONS[field]}`
        : FALLBACK_QUESTIONS[field],
    why: "This is still one of the least-supported parts of the idea.",
    evidenceRef: null,
    mode: "answer",
    redrawPrompt: null,
  };
}

async function finalizeIdeaForConfirmation(
  client: OpenAI,
  model: string,
  input: GrillTurnRequest,
) {
  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Resolve the final IdeaModel for confirmation.",
              "The Grill is over. There must be no openDecisions.",
              "For every unresolved ambiguity, choose the best-supported interpretation from the transcript, typed notes, drawings, and answers.",
              "Move any remaining uncertainty into assumptions, not openDecisions.",
              "Do not use meta language like 'keyframes show a hand' or 'the transcript is the only source'.",
              `IdeaModel: ${JSON.stringify(input.idea)}`,
              `Latest answer: ${input.answer ?? "none"}`,
            ].join("\n"),
          },
          ...input.keyframes.map((frame) => ({
            type: "input_image" as const,
            image_url: frame.imageDataUrl,
            detail: "high" as const,
          })),
        ],
      },
    ],
    text: { format: zodTextFormat(ideaModelSchema, "idea_model") },
  });
  if (!response.output_parsed)
    throw new Error("OpenAI returned no final IdeaModel.");
  return { ...response.output_parsed, openDecisions: [] };
}

export async function runGrillTurn(
  apiKey: string,
  input: GrillTurnRequest,
): Promise<GrillTurnResult> {
  const model = process.env.OPENAI_SYNTHESIS_MODEL ?? "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });

  if (shouldStopGrill(input.idea, input.questionCount)) {
    const idea = await finalizeIdeaForConfirmation(client, model, input);
    return { idea, nextQuestion: null, done: true };
  }

  const weakest = lowestConfidenceField(input.idea);
  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "You are the Grill engine for The Articulator 3000.",
              "Update the IdeaModel from the creator's latest answer and latest keyframes, then ask exactly one concise question about the lowest-confidence foundational field.",
              `The deterministic weakest field is: ${weakest}.`,
              `Questions already answered: ${input.questionCount}. Ask at least ${GRILL_QUESTION_MIN} questions and no more than ${GRILL_QUESTION_CAP}.`,
              `Before ${GRILL_QUESTION_MIN} answers, done MUST be false and nextQuestion MUST be present.`,
              "Never ask for something already established. Reference evidence when useful.",
              "The keyframes are hand-drawn evidence from the creator. Inspect them directly and infer ordinary shapes/relationships when visible.",
              "If the visual evidence is ambiguous, ask the creator to draw a specific part again. In that case set nextQuestion.mode='redraw' and include a concrete redrawPrompt.",
              "Treat 'I don't know yet' as a signal to make the best-supported assumption later, not as a permanent open decision.",
              "Treat 'That assumption is wrong' as a correction: remove or rewrite the assumption and lower unsupported confidence.",
              "When done=true, clear openDecisions by converting remaining ambiguity into explicit assumptions.",
              "Do not output meta open decisions about what the keyframes do or do not prove.",
              "",
              `Previous question: ${input.previousQuestion?.question ?? "none"}`,
              `Creator answer: ${input.answer ?? "No answer yet; choose the first question."}`,
              `Current IdeaModel: ${JSON.stringify(input.idea)}`,
            ].join("\n"),
          },
          ...input.keyframes.map((frame) => ({
            type: "input_image" as const,
            image_url: frame.imageDataUrl,
            detail: "high" as const,
          })),
        ],
      },
    ],
    text: {
      format: zodTextFormat(grillTurnResultSchema, "grill_turn"),
    },
  });

  if (!response.output_parsed)
    throw new Error("OpenAI returned no Grill turn.");
  const answeredQuestionCount = input.questionCount + 1;
  if (shouldStopGrill(response.output_parsed.idea, answeredQuestionCount)) {
    const idea = await finalizeIdeaForConfirmation(client, model, {
      ...input,
      idea: response.output_parsed.idea,
    });
    return { idea, nextQuestion: null, done: true };
  }

  if (response.output_parsed.done || !response.output_parsed.nextQuestion) {
    return {
      idea: response.output_parsed.idea,
      nextQuestion: fallbackQuestion(
        response.output_parsed.idea,
        answeredQuestionCount,
      ),
      done: false,
    };
  }

  return { ...response.output_parsed, done: false };
}
