import {
  useFetcher,
  type LoaderFunctionArgs,
  type MetaFunction,
  Form,
} from "react-router";
import { useEffect, useState } from "react";
import {
  type SFTFormValues,
  SFTFormValuesSchema,
  SFTFormValuesResolver,
} from "./types";
import type { Route } from "./+types/route";
import { v7 as uuid } from "uuid";
import type { SFTJob } from "~/utils/fine_tuning/common";
import { models } from "./model_options";
import { useRevalidator } from "react-router";
import { useForm, FormProvider } from "react-hook-form";
import { redirect } from "react-router";
import { launch_sft_job } from "~/utils/fine_tuning/client";
import type { ChatCompletionConfig } from "~/utils/config/variant";
import { useConfig } from "~/context/config";
import { FunctionSelector } from "./FunctionSelector";
import { MetricSelector } from "./MetricSelector";
import { VariantSelector } from "./VariantSelector";
import { ModelSelector } from "./ModelSelector";
import { AdvancedParametersAccordion } from "./AdvancedParametersAccordion";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

export const meta: MetaFunction = () => {
  return [
    { title: "TensorZeroFine-Tuning Dashboard" },
    { name: "description", content: "Fine Tuning Optimization Dashboard" },
  ];
};

// Mutable store mapping job IDs to their info
export const jobStore: { [jobId: string]: SFTJob } = {};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const job_id = url.searchParams.get("job_id");

  if (!job_id) {
    return { jobInfo: null, status: "idle" };
  }

  const storedJob = jobStore[job_id];
  if (!storedJob) {
    throw new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
    });
  }

  try {
    // Poll for updates
    console.log("polling for updates");
    const updatedJob = await storedJob.poll();
    console.log("updatedJob", updatedJob);
    jobStore[job_id] = updatedJob;

    const result = updatedJob.result();
    // TODO (Viraj, important!): fix the status here.
    const status = result ? "completed" : "running";

    return {
      jobInfo: updatedJob,
      status,
      result,
    };
  } catch (error) {
    return {
      jobInfo: storedJob,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const serializedFormData = formData.get("data");
  if (!serializedFormData || typeof serializedFormData !== "string") {
    throw new Error("Form data must be provided");
  }

  const jsonData = JSON.parse(serializedFormData);
  const validatedData = SFTFormValuesSchema.parse(jsonData);

  const job = await launch_sft_job(validatedData);
  jobStore[validatedData.jobId] = job;

  return redirect(`/optimization/fine-tuning?job_id=${validatedData.jobId}`);
}

export default function FineTuning({ loaderData }: Route.ComponentProps) {
  const config = useConfig();
  const { jobInfo, status, result, error } = loaderData;
  const revalidator = useRevalidator();
  let fetcher = useFetcher();

  // If running, periodically poll for updates on the job
  useEffect(() => {
    if (status === "running") {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [status, revalidator]);
  const form = useForm<SFTFormValues>({
    defaultValues: {
      function: "",
      metric: "",
      validationSplitPercent: 20,
      maxSamples: 100000,
      threshold: 0.5,
    },
    resolver: SFTFormValuesResolver,
  });

  // const testData: SFTFormValues = {
  //   function: "dashboard_fixture_extract_entities",
  //   metric: "dashboard_fixture_exact_match",
  //   model: {
  //     displayName: "llama-3.1-8b-instruct",
  //     name: "accounts/fireworks/models/llama-v3p1-8b-instruct",
  //     provider: "fireworks",
  //   },
  //   // model: {
  //   //   displayName: "gpt-4o-mini-2024-07-18",
  //   //   name: "gpt-4o-mini-2024-07-18",
  //   //   provider: "openai",
  //   // },
  //   variant: "baseline",
  //   validationSplitPercent: 20,
  //   maxSamples: 1000,
  //   threshold: 0.8,
  //   jobId: uuid(),
  // };

  const [submissionResult, setSubmissionResult] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<
    "idle" | "submitting" | "pending" | "complete"
  >("idle");

  const [counts, setCounts] = useState<{
    inferenceCount: number | null;
    feedbackCount: number | null;
    curatedInferenceCount: number | null;
  }>({
    inferenceCount: null,
    feedbackCount: null,
    curatedInferenceCount: null,
  });

  const fetchCounts = async (functionName?: string, metricName?: string) => {
    const params = new URLSearchParams();
    if (functionName) params.set("function", functionName);
    if (metricName) params.set("metric", metricName);

    const response = await fetch(`/api/curated_inferences/count?${params}`);
    const data = await response.json();
    setCounts(data);
  };

  const handleFunctionChange = (value: string) => {
    fetchCounts(value, form.getValues("metric") || undefined);
  };

  const handleMetricChange = (value: string) => {
    fetchCounts(form.getValues("function") || undefined, value);
  };

  const getChatCompletionVariantsForFunction = (): Record<
    string,
    ChatCompletionConfig
  > => {
    const selectedFunction = form.getValues("function");

    if (!selectedFunction || !config?.functions[selectedFunction]) {
      return {};
    }

    const functionConfig = config.functions[selectedFunction];
    return Object.fromEntries(
      Object.entries(functionConfig.variants || {}).filter(
        (entry): entry is [string, ChatCompletionConfig] =>
          entry[1].type === "chat_completion",
      ),
    );
  };

  useEffect(() => {
    if (counts.inferenceCount !== null) {
      form.setValue("maxSamples", Math.min(100000, counts.inferenceCount));
    }
  }, [counts.inferenceCount, form]);

  function getButtonText() {
    switch (submissionPhase) {
      case "submitting":
        return "Submitting...";
      case "pending":
        return "Pending...";
      case "complete":
        return "Complete";
      default:
        return "Start Fine-tuning Job";
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4">
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          Fine-Tuning
        </h2>

        <div className="mt-8">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit((data) => {
                console.log("Form data:", data);

                // Add jobId to the form data
                const formData = {
                  ...data,
                  jobId: uuid(),
                };

                // Create a FormData instance and append the serialized data
                const submitData = new FormData();
                submitData.append("data", JSON.stringify(formData));

                // Submit using the fetcher
                fetcher.submit(submitData, {
                  method: "POST",
                });

                setSubmissionPhase("submitting");
              })(e);
            }}
          >
            {/* Wrap form contents with FormProvider */}
            <FormProvider {...form}>
              <div className="space-y-6">
                <FunctionSelector
                  control={form.control}
                  inferenceCount={counts.inferenceCount}
                  config={config}
                  onFunctionChange={handleFunctionChange}
                />

                <MetricSelector
                  control={form.control}
                  feedbackCount={counts.feedbackCount}
                  curatedInferenceCount={counts.curatedInferenceCount}
                  config={config}
                  onMetricChange={handleMetricChange}
                />

                <VariantSelector
                  control={form.control}
                  chatCompletionVariants={getChatCompletionVariantsForFunction()}
                />

                <ModelSelector control={form.control} models={models} />

                <AdvancedParametersAccordion control={form.control} />
              </div>

              <div className="space-y-4">
                <Button
                  type="submit"
                  disabled={
                    !form.watch("function") ||
                    !form.watch("metric") ||
                    !form.watch("model") ||
                    !form.watch("variant") ||
                    form.formState.isSubmitting ||
                    isSubmitted
                  }
                >
                  {getButtonText()}
                </Button>

                {submissionResult && (
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <div className="mb-2 font-medium">Job Status</div>
                    <Textarea
                      value={submissionResult}
                      className="w-full h-48 resize-none bg-transparent border-none focus:ring-0"
                      readOnly
                    />
                  </div>
                )}

                {finalResult && (
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <div className="mb-2 font-medium">Configuration</div>
                    <Textarea
                      value={finalResult}
                      className="w-full h-48 resize-none bg-transparent border-none focus:ring-0"
                      readOnly
                    />
                  </div>
                )}
              </div>
            </FormProvider>
          </form>
        </div>
      </main>
    </div>
  );
}
