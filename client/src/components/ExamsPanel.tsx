import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Mic,
  Plus,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Video,
  Trash2,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import { ExamQuestionInput } from "./ExamQuestionInput";

type QuestionType =
  | "open"
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "matching"
  | "ordering";
const labels: Record<QuestionType, string> = {
  open: "Abierta",
  single_choice: "Selección única",
  multiple_choice: "Selección múltiple",
  true_false: "Verdadero o falso",
  fill_blank: "Completar",
  matching: "Relacionar",
  ordering: "Ordenar",
};

function StudentExam({
  examId,
  onBack,
}: {
  examId: number;
  onBack: () => void;
}) {
  const exam = trpc.exams.get.useQuery({ examId });
  const start = trpc.exams.startAttempt.useMutation();
  const submit = trpc.exams.submitAttempt.useMutation({
    onSuccess: data => {
      toast.success(
        data.requiresTutorReview
          ? "Enviado para revisión del tutor."
          : `Examen calificado: ${data.autoScore}/${data.maxScore} puntos.`
      );
      onBack();
    },
    onError: error => toast.error(error.message),
  });
  const event = trpc.exams.proctoringEvent.useMutation();
  const uploadRecording = trpc.exams.uploadRecording.useMutation({
    onSuccess: () => toast.success("Grabación guardada para revisión docente."),
    onError: error =>
      toast.error(`No se pudo guardar la grabación: ${error.message}`),
  });
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
  });
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  useEffect(
    () => () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    },
    []
  );
  useEffect(() => {
    const handler = () => {
      if (attemptId)
        event.mutate({
          attemptId,
          eventType: document.hidden ? "tab_hidden" : "tab_visible",
        });
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [attemptId]);
  useEffect(() => {
    if (remainingSeconds == null || !attemptId) return;
    const timer = window.setInterval(
      () =>
        setRemainingSeconds(value =>
          value == null || value <= 1 ? 0 : value - 1
        ),
      1000
    );
    return () => window.clearInterval(timer);
  }, [attemptId, remainingSeconds == null]);
  useEffect(() => {
    if (remainingSeconds === 0 && attemptId) {
      setRemainingSeconds(null);
      stopRecording();
      submit.mutate({
        attemptId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          answer,
        })),
      });
    }
  }, [remainingSeconds, attemptId]);
  const begin = async () => {
    if (!recordingConsent) {
      toast.error("Debes aceptar la grabación para iniciar.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(
        "Este navegador no permite cámara y micrófono aquí. Usa HTTPS y concede permisos desde la configuración del sitio."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const cameraTrack = stream.getVideoTracks()[0];
      const microphoneTrack = stream.getAudioTracks()[0];
      const camera = Boolean(
        cameraTrack && cameraTrack.readyState === "live" && cameraTrack.enabled
      );
      const microphone = Boolean(
        microphoneTrack &&
          microphoneTrack.readyState === "live" &&
          microphoneTrack.enabled
      );
      setPermissions({ camera, microphone });
      if (!camera || !microphone) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error(
          "El navegador no confirmó que ambos dispositivos estén activos. Revisa los permisos del sitio y vuelve a intentarlo."
        );
      }
      const result = await start.mutateAsync({
        examId,
        cameraGranted: camera,
        microphoneGranted: microphone,
      });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm",
      });
      chunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setAttemptId(result.attemptId);
      setRemainingSeconds(result.durationMinutes * 60);
      toast.success("Examen iniciado y grabación consentida activa.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Debes permitir cámara, micrófono y grabación para iniciar el examen."
      );
    }
  };
  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let index = 0; index < bytes.length; index += 0x8000)
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(index, index + 0x8000))
          );
        if (attemptId && blob.size > 0)
          uploadRecording.mutate({
            attemptId,
            dataBase64: btoa(binary),
            mimeType: "video/webm",
          });
      };
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
  };
  if (exam.isLoading || !exam.data)
    return (
      <div className="wij-card p-8 text-center text-[#9AA8B9]">
        Cargando examen…
      </div>
    );
  if (!attemptId)
    return (
      <section className="wij-card p-6">
        <Button
          variant="outline"
          className="mb-5 border-[#3A4556] bg-transparent text-[#DDE5EE]"
          onClick={onBack}
        >
          Volver
        </Button>
        <h2 className="font-display text-2xl font-bold text-white">
          {exam.data.exam.title}
        </h2>
        <p className="mt-2 text-sm text-[#B7C3D0]">
          {exam.data.exam.instructions ||
            "Lee cada pregunta y envía tus respuestas al finalizar."}
        </p>
        <div className="mt-6 grid gap-3 rounded-2xl border border-[#B69A5E]/35 bg-[#B69A5E]/10 p-4 text-sm text-[#E6D6AB]">
          <p className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            La cámara debe permanecer activa.
          </p>
          <p className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            El micrófono debe permanecer activo.
          </p>
          <p className="text-xs text-[#B7C3D0]">
            Al autorizar, verificaremos que ambos dispositivos estén realmente
            activos antes de iniciar.
          </p>
          <p className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            La sesión será grabada y quedará disponible únicamente para el tutor
            autorizado.
          </p>
          <label className="flex items-start gap-2 text-xs text-[#DDE5EE]">
            <input
              type="checkbox"
              checked={recordingConsent}
              onChange={event => setRecordingConsent(event.target.checked)}
              className="mt-0.5"
            />
            Acepto la grabación audiovisual del intento, su revisión académica y
            el tratamiento institucional informado antes de comenzar.
          </label>
        </div>
        <Button
          className="mt-5 bg-[#B69A5E] text-[#171A17] hover:bg-[#D8BF86]"
          disabled={start.isPending || !recordingConsent}
          onClick={begin}
        >
          Autorizar, grabar y comenzar
        </Button>
      </section>
    );
  return (
    <section className="space-y-5">
      <div className="wij-card flex items-center justify-between p-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            {exam.data.exam.title}
          </h2>
          <p className="text-sm text-[#9AA8B9]">
            Intento supervisado ·{" "}
            {remainingSeconds == null
              ? `${exam.data.exam.durationMinutes} minutos`
              : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")} restantes`}
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs text-[#45D6A6]">
          <Camera className="h-4 w-4" />{" "}
          {permissions.camera ? "Cámara activa" : "Cámara no detectada"} ·{" "}
          <Mic className="h-4 w-4" />{" "}
          {permissions.microphone
            ? "Micrófono activo"
            : "Micrófono no detectado"}
        </span>
      </div>
      {exam.data.questions.map((question, index) => (
        <article key={question.id} className="wij-card p-5">
          <p className="text-xs font-bold uppercase text-[#D8BF86]">
            Pregunta {index + 1} · {labels[question.questionType]}
          </p>
          <h3 className="mt-2 font-display text-lg font-bold text-white">
            {question.prompt}
          </h3>
          <ExamQuestionInput
            question={question}
            value={answers[question.id] || ""}
            onChange={value =>
              setAnswers(current => ({ ...current, [question.id]: value }))
            }
          />
        </article>
      ))}
      <Button
        className="bg-[#2F9E72] hover:bg-[#267F5C]"
        disabled={submit.isPending}
        onClick={() => {
          stopRecording();
          submit.mutate({
            attemptId,
            answers: Object.entries(answers).map(([questionId, answer]) => ({
              questionId: Number(questionId),
              answer,
            })),
          });
        }}
      >
        <CheckCircle2 className="h-4 w-4" />
        Enviar examen
      </Button>
    </section>
  );
}

function AttemptReview({
  attemptId,
  onBack,
}: {
  attemptId: number;
  onBack: () => void;
}) {
  const review = trpc.exams.attemptReview.useQuery({ attemptId });
  const grade = trpc.exams.gradeAttempt.useMutation({
    onSuccess: data => {
      toast.success(`Nota publicada: ${data.finalScore}/${data.maxScore}`);
      onBack();
    },
    onError: error => toast.error(error.message),
  });
  const [scores, setScores] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState("");
  if (review.isLoading)
    return (
      <div className="wij-card p-8 text-center text-[#9AA8B9]">
        Cargando intento…
      </div>
    );
  if (review.error)
    return (
      <section className="wij-card space-y-4 p-8 text-center">
        <p className="text-sm text-[#E28A8A]">
          No se pudo abrir la revisión: {review.error.message}
        </p>
        <Button
          variant="outline"
          className="border-[#3A4556] bg-transparent text-[#DDE5EE]"
          onClick={onBack}
        >
          Volver a exámenes
        </Button>
      </section>
    );
  if (!review.data)
    return (
      <section className="wij-card space-y-4 p-8 text-center">
        <p className="text-sm text-[#E28A8A]">
          El intento no está disponible para la institución activa o ya no
          existe.
        </p>
        <Button
          variant="outline"
          className="border-[#3A4556] bg-transparent text-[#DDE5EE]"
          onClick={onBack}
        >
          Volver a exámenes
        </Button>
      </section>
    );
  const data = review.data;
  return (
    <section className="space-y-5">
      <Button
        variant="outline"
        className="border-[#3A4556] bg-transparent text-[#DDE5EE]"
        onClick={onBack}
      >
        Volver a exámenes
      </Button>
      <div className="wij-card p-5">
        <h2 className="font-display text-2xl font-bold text-white">
          Revisión del intento
        </h2>
        <p className="mt-1 text-sm text-[#9AA8B9]">
          Respuestas del estudiante · {data.attempt.status}
        </p>
        {data.recordingUrl && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#DDE5EE]">
              <Video className="h-4 w-4 text-[#D8BF86]" />
              Grabación consentida del intento
            </p>
            <video
              controls
              preload="metadata"
              className="max-h-[420px] w-full rounded-xl bg-black"
              src={data.recordingUrl}
            >
              Tu navegador no puede reproducir esta grabación.
            </video>
          </div>
        )}
      </div>
      {data.answers.map(answer => {
        const question = data.questions.find(
          item => item.id === answer.questionId
        );
        return (
          <article key={answer.id} className="wij-card p-5">
            <p className="text-xs font-bold uppercase text-[#D8BF86]">
              {question?.questionType === "open"
                ? "Respuesta abierta"
                : "Respuesta objetiva"}
            </p>
            <h3 className="mt-2 font-display text-lg font-bold text-white">
              {question?.prompt || "Pregunta"}
            </h3>
            <p className="mt-3 rounded-xl bg-[#151B18] p-3 text-sm text-[#DDE5EE]">
              {answer.answer}
            </p>
            {question?.questionType === "open" && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  className="wij-input max-w-32"
                  type="number"
                  min="0"
                  max={question.points}
                  placeholder={`0-${question.points}`}
                  value={scores[answer.id] || ""}
                  onChange={e =>
                    setScores(current => ({
                      ...current,
                      [answer.id]: e.target.value,
                    }))
                  }
                />
                <input
                  className="wij-input flex-1"
                  placeholder="Comentario para esta respuesta"
                />
              </div>
            )}
          </article>
        );
      })}
      <div className="wij-card p-5">
        <label className="text-sm font-semibold text-[#DDE5EE]">
          Retroalimentación general
        </label>
        <textarea
          className="wij-input mt-2 min-h-24 py-3"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Comentarios del tutor"
        />
        <Button
          className="mt-4 bg-[#2F9E72] hover:bg-[#267F5C]"
          disabled={grade.isPending}
          onClick={() =>
            grade.mutate({
              attemptId,
              manualScores: Object.entries(scores).map(([answerId, score]) => ({
                answerId: Number(answerId),
                score: Number(score),
              })),
              tutorFeedback: feedback || null,
            })
          }
        >
          <CheckCircle2 className="h-4 w-4" />
          Publicar nota
        </Button>
      </div>
    </section>
  );
}

export default function ExamsPanel({
  subjects,
  canManage,
  isStudent,
}: {
  subjects: Array<{ id: number; code: string; name: string }>;
  canManage: boolean;
  isStudent: boolean;
}) {
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [reviewAttemptId, setReviewAttemptId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    topic: "",
    questionCount: "5",
    durationMinutes: "60",
    difficulty: "intermediate" as "basic" | "intermediate" | "advanced",
    availableFrom: "",
    availableUntil: "",
  });
  const [manualQuestions, setManualQuestions] = useState<
    Array<{
      questionType: QuestionType;
      prompt: string;
      options: string[];
      correctAnswer: string;
      points: number;
    }>
  >([
    {
      questionType: "single_choice",
      prompt: "",
      options: ["A. ", "B. ", "C. ", "D. "],
      correctAnswer: "",
      points: 10,
    },
  ]);
  const [selectedAiTypes, setSelectedAiTypes] = useState<QuestionType[]>([
    "single_choice",
  ]);
  const [aiProposal, setAiProposal] = useState<{
    title: string;
    instructions: string;
    questions: Array<{
      questionType: QuestionType;
      prompt: string;
      options?: unknown;
      correctAnswer?: unknown;
      rubric?: string | null;
      points: number;
    }>;
  } | null>(null);
  const utils = trpc.useUtils();
  const exams = trpc.exams.list.useQuery(subjectId ? { subjectId } : undefined);
  const create = trpc.exams.createManual.useMutation({
    onSuccess: async () => {
      toast.success("Examen guardado.");
      setForm(current => ({ ...current, title: "" }));
      setManualQuestions([
        {
          questionType: "single_choice",
          prompt: "",
          options: ["A. ", "B. ", "C. ", "D. "],
          correctAnswer: "",
          points: 10,
        },
      ]);
      await utils.exams.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.exams.delete.useMutation({
    onSuccess: async () => {
      toast.success("Examen eliminado junto con sus preguntas e intentos.");
      await utils.exams.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const generate = trpc.exams.generateWithAI.useMutation({
    onSuccess: data => {
      setAiProposal(data);
      toast.success("Propuesta generada. Revísala antes de publicar.");
    },
    onError: error => toast.error(error.message),
  });
  const toggleAiType = (type: QuestionType) =>
    setSelectedAiTypes(current =>
      current.includes(type)
        ? current.filter(item => item !== type)
        : [...current, type]
    );
  if (selectedExam && isStudent)
    return (
      <StudentExam examId={selectedExam} onBack={() => setSelectedExam(null)} />
    );
  if (reviewAttemptId && canManage)
    return (
      <AttemptReview
        attemptId={reviewAttemptId}
        onBack={() => setReviewAttemptId(null)}
      />
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B69A5E]/15 text-[#D8BF86]">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Exámenes
            </h2>
            <p className="text-sm text-[#9AA8B9]">
              Evaluaciones manuales, generación IA y presentación supervisada.
            </p>
          </div>
        </div>
        <select
          className="wij-input max-w-xs"
          value={subjectId || ""}
          onChange={e =>
            setSubjectId(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">Todas las materias</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>
              {subject.code} · {subject.name}
            </option>
          ))}
        </select>
      </div>
      {canManage && (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="wij-card p-5">
            <h3 className="font-display text-lg font-bold text-white">
              Crear manualmente
            </h3>
            <div className="mt-4 grid gap-3">
              <select
                className="wij-input"
                value={subjectId || ""}
                onChange={e => setSubjectId(Number(e.target.value))}
              >
                <option value="">Materia</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} · {subject.name}
                  </option>
                ))}
              </select>
              <input
                className="wij-input"
                placeholder="Título del examen"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase text-[#B7C3D0]">
                  Disponible desde
                  <input
                    className="wij-input mt-1"
                    type="datetime-local"
                    value={form.availableFrom}
                    onChange={e =>
                      setForm({ ...form, availableFrom: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-semibold uppercase text-[#B7C3D0]">
                  Disponible hasta
                  <input
                    className="wij-input mt-1"
                    type="datetime-local"
                    value={form.availableUntil}
                    onChange={e =>
                      setForm({ ...form, availableUntil: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="space-y-3">
                {manualQuestions.map((question, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[#3A4556] bg-[#151B18] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#D8BF86]">
                        Pregunta {index + 1} · {question.points} puntos
                      </span>
                      {manualQuestions.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-[#E28A8A]"
                          onClick={() =>
                            setManualQuestions(current =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index
                              )
                            )
                          }
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <select
                      className="wij-input"
                      value={question.questionType}
                      onChange={e =>
                        setManualQuestions(current =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  questionType: e.target.value as QuestionType,
                                }
                              : item
                          )
                        )
                      }
                    >
                      {Object.entries(labels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="wij-input mt-2 min-h-20 py-3"
                      placeholder="Enunciado de la pregunta"
                      value={question.prompt}
                      onChange={e =>
                        setManualQuestions(current =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, prompt: e.target.value }
                              : item
                          )
                        )
                      }
                    />
                    {(question.questionType === "single_choice" ||
                      question.questionType === "multiple_choice") && (
                      <div className="mt-2 grid gap-2">
                        <p className="text-xs font-semibold uppercase text-[#D8BF86]">
                          Opciones A, B, C y D
                        </p>
                        {question.options.map((option, optionIndex) => (
                          <input
                            key={optionIndex}
                            className="wij-input"
                            placeholder={`${String.fromCharCode(65 + optionIndex)}. Opción`}
                            value={option}
                            onChange={e =>
                              setManualQuestions(current =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        options: item.options.map(
                                          (value, currentOptionIndex) =>
                                            currentOptionIndex === optionIndex
                                              ? e.target.value
                                              : value
                                        ),
                                      }
                                    : item
                                )
                              )
                            }
                          />
                        ))}
                        {question.questionType === "multiple_choice" ? (
                          <div className="grid gap-2 rounded-xl border border-[#3A4556] p-3 text-xs text-[#DDE5EE]">
                            <p className="font-semibold text-[#D8BF86]">
                              Selecciona una o varias respuestas correctas
                            </p>
                            {question.options.filter(Boolean).map(option => {
                              const selected = question.correctAnswer
                                .split("||")
                                .includes(option);
                              return (
                                <label
                                  key={option}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={event =>
                                      setManualQuestions(current =>
                                        current.map((item, itemIndex) => {
                                          if (itemIndex !== index) return item;
                                          const values = item.correctAnswer
                                            .split("||")
                                            .filter(Boolean);
                                          const next = event.target.checked
                                            ? [...values, option]
                                            : values.filter(
                                                value => value !== option
                                              );
                                          return {
                                            ...item,
                                            correctAnswer: next.join("||"),
                                          };
                                        })
                                      )
                                    }
                                  />
                                  {option}
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <select
                            className="wij-input"
                            value={question.correctAnswer}
                            onChange={e =>
                              setManualQuestions(current =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, correctAnswer: e.target.value }
                                    : item
                                )
                              )
                            }
                          >
                            <option value="">Selecciona la correcta</option>
                            {question.options.filter(Boolean).map(option => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                    {question.questionType === "true_false" && (
                      <select
                        className="wij-input mt-2"
                        value={question.correctAnswer}
                        onChange={e =>
                          setManualQuestions(current =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    correctAnswer: e.target.value,
                                    options: ["Verdadero", "Falso"],
                                  }
                                : item
                            )
                          )
                        }
                      >
                        <option value="">Respuesta correcta: selecciona</option>
                        <option value="Verdadero">Verdadero</option>
                        <option value="Falso">Falso</option>
                      </select>
                    )}
                    <input
                      className="wij-input mt-2"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Puntos"
                      value={question.points}
                      onChange={e =>
                        setManualQuestions(current =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, points: Number(e.target.value) || 1 }
                              : item
                          )
                        )
                      }
                    />
                    {question.questionType !== "single_choice" &&
                      question.questionType !== "multiple_choice" &&
                      question.questionType !== "true_false" && (
                        <input
                          className="wij-input mt-2"
                          placeholder="Respuesta correcta o clave (opcional)"
                          value={question.correctAnswer}
                          onChange={e =>
                            setManualQuestions(current =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, correctAnswer: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#3A4556] bg-transparent text-[#DDE5EE]"
                  onClick={() =>
                    setManualQuestions(current => [
                      ...current,
                      {
                        questionType: "open",
                        prompt: "",
                        options: ["A. ", "B. ", "C. ", "D. "],
                        correctAnswer: "",
                        points: 10,
                      },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Agregar otra pregunta
                </Button>
              </div>
            </div>
            <Button
              className="mt-4 bg-[#B69A5E] text-[#171A17] hover:bg-[#D8BF86]"
              disabled={create.isPending}
              onClick={() => {
                const invalid =
                  !subjectId ||
                  !form.title.trim() ||
                  manualQuestions.some(
                    question =>
                      !question.prompt.trim() ||
                      question.points < 1 ||
                      ((question.questionType === "single_choice" ||
                        question.questionType === "multiple_choice") &&
                        (question.options.some(option => !option.trim()) ||
                          !question.correctAnswer))
                  );
                if (invalid) {
                  toast.error(
                    "Selecciona una materia, escribe el título y completa cada pregunta, sus puntos y sus opciones."
                  );
                  return;
                }
                if (subjectId)
                  create.mutate({
                    subjectId,
                    title: form.title,
                    description: null,
                    instructions: null,
                    durationMinutes: Number(form.durationMinutes),
                    availableFrom: form.availableFrom
                      ? new Date(form.availableFrom)
                      : null,
                    availableUntil: form.availableUntil
                      ? new Date(form.availableUntil)
                      : null,
                    maxAttempts: 1,
                    requiresCamera: true,
                    requiresMicrophone: true,
                    status: "published",
                    questions: manualQuestions.map((question, index) => ({
                      questionType: question.questionType,
                      prompt: question.prompt,
                      options:
                        question.questionType === "single_choice" ||
                        question.questionType === "multiple_choice"
                          ? question.options
                          : question.questionType === "true_false"
                            ? ["Verdadero", "Falso"]
                            : null,
                      correctAnswer:
                        question.questionType === "multiple_choice"
                          ? question.correctAnswer.split("||").filter(Boolean)
                          : question.correctAnswer || null,
                      rubric:
                        question.questionType === "open"
                          ? "Evaluar claridad, argumentos y aplicación."
                          : null,
                      points: question.points,
                      sortOrder: index,
                    })),
                  });
              }}
            >
              <Plus className="h-4 w-4" />
              Publicar examen
            </Button>
          </section>
          <section className="wij-card p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <Sparkles className="h-5 w-5 text-[#D8BF86]" />
              Generar con IA
            </h3>
            <div className="mt-4 grid gap-3">
              <input
                className="wij-input"
                placeholder="Tema del examen"
                value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })}
              />
              <input
                className="wij-input"
                type="number"
                min="1"
                max="30"
                value={form.questionCount}
                onChange={e =>
                  setForm({ ...form, questionCount: e.target.value })
                }
              />
              <select
                className="wij-input"
                value={form.difficulty}
                onChange={e =>
                  setForm({
                    ...form,
                    difficulty: e.target.value as typeof form.difficulty,
                  })
                }
              >
                <option value="basic">Básica</option>
                <option value="intermediate">Intermedia</option>
                <option value="advanced">Avanzada</option>
              </select>
              <p className="rounded-xl border border-[#B69A5E]/30 bg-[#B69A5E]/10 px-3 py-2 text-xs text-[#E6D6AB]">
                La IA respetará únicamente los tipos seleccionados y los
                distribuirá en orden. Ejemplo: 5 preguntas con Verdadero/Falso +
                Abiertas = 3 y 2.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#DDE5EE]">
                {Object.entries(labels).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 rounded-lg border border-[#3A4556] px-2 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAiTypes.includes(value as QuestionType)}
                      onChange={() => toggleAiType(value as QuestionType)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="mt-4 bg-[#2F9E72] hover:bg-[#267F5C]"
              disabled={generate.isPending}
              onClick={() => {
                if (
                  !subjectId ||
                  !form.topic.trim() ||
                  selectedAiTypes.length === 0
                ) {
                  toast.error(
                    "Selecciona una materia, escribe el tema y elige al menos un tipo de pregunta."
                  );
                  return;
                }
                if (subjectId)
                  generate.mutate({
                    subjectId,
                    topic: form.topic,
                    questionCount: Number(form.questionCount),
                    difficulty: form.difficulty,
                    questionTypes: selectedAiTypes,
                  });
              }}
            >
              <Sparkles className="h-4 w-4" />
              Generar propuesta
            </Button>
            {aiProposal && (
              <div className="mt-4 rounded-xl border border-[#B69A5E]/30 bg-[#B69A5E]/10 p-4 text-sm text-[#E6D6AB]">
                <b>{aiProposal.title}</b>
                <p className="mt-1">
                  {aiProposal.questions.length} preguntas generadas. Revísalas
                  antes de publicarlas.
                </p>
                <div className="mt-3 space-y-2">
                  {aiProposal.questions.map((question, index) => (
                    <div key={index} className="rounded-lg bg-[#151B18] p-3">
                      <span className="text-xs font-bold uppercase text-[#D8BF86]">
                        {labels[question.questionType]}
                      </span>
                      <p className="mt-1 text-[#DDE5EE]">{question.prompt}</p>
                      {Array.isArray(question.options) && (
                        <div className="mt-2 grid gap-1 text-xs text-[#B7C3D0]">
                          {question.options.map((option, optionIndex) => (
                            <span key={optionIndex}>
                              {String.fromCharCode(65 + optionIndex)}.{" "}
                              {String(option)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-4 bg-[#B69A5E] text-[#171A17] hover:bg-[#D8BF86]"
                  disabled={create.isPending}
                  onClick={() => {
                    if (!subjectId) {
                      toast.error(
                        "Selecciona una materia antes de publicar la propuesta."
                      );
                      return;
                    }
                    create.mutate({
                      subjectId,
                      title: aiProposal.title,
                      description: null,
                      instructions: aiProposal.instructions,
                      durationMinutes: Number(form.durationMinutes),
                      availableFrom: form.availableFrom
                        ? new Date(form.availableFrom)
                        : null,
                      availableUntil: form.availableUntil
                        ? new Date(form.availableUntil)
                        : null,
                      maxAttempts: 1,
                      requiresCamera: true,
                      requiresMicrophone: true,
                      status: "published",
                      questions: aiProposal.questions.map(
                        (question, index) => ({
                          ...question,
                          sortOrder: index,
                          options: question.options ?? null,
                          correctAnswer: question.correctAnswer ?? null,
                          rubric: question.rubric ?? null,
                        })
                      ),
                    });
                  }}
                >
                  Publicar propuesta revisada
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
      <section className="grid gap-4 lg:grid-cols-2">
        {!exams.data?.length ? (
          <div className="wij-card p-10 text-center text-sm text-[#9AA8B9]">
            No hay exámenes disponibles.
          </div>
        ) : (
          exams.data.map(row => (
            <article
              key={row.exam.id}
              className="wij-card flex items-center justify-between gap-3 p-5"
            >
              <div>
                <p className="text-xs font-bold uppercase text-[#D8BF86]">
                  {row.subjectName}
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-white">
                  {row.exam.title}
                </h3>
                <p className="text-sm text-[#9AA8B9]">
                  {row.exam.durationMinutes} min ·{" "}
                  {row.exam.requiresCamera ? "Cámara requerida" : "Sin cámara"}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-[#B7C3D0]">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {row.exam.availableFrom
                    ? `Desde ${new Date(row.exam.availableFrom).toLocaleString()}`
                    : "Disponible de inmediato"}
                  {row.exam.availableUntil
                    ? ` · Hasta ${new Date(row.exam.availableUntil).toLocaleString()}`
                    : ""}
                </p>
              </div>
              {isStudent && (
                <Button
                  className="bg-[#B69A5E] text-[#171A17] hover:bg-[#D8BF86]"
                  onClick={() => setSelectedExam(row.exam.id)}
                >
                  Presentar
                </Button>
              )}
              {canManage && (
                <Button
                  variant="outline"
                  className="border-[#3A4556] bg-transparent text-[#DDE5EE]"
                  onClick={async () => {
                    try {
                      const attempts = await utils.exams.attempts.fetch({
                        examId: row.exam.id,
                      });
                      const reviewable =
                        attempts.find(item =>
                          ["under_review", "graded", "submitted"].includes(
                            item.attempt.status
                          )
                        ) ?? attempts[0];
                      if (reviewable) setReviewAttemptId(reviewable.attempt.id);
                      else
                        toast.info(
                          "Todavía no hay un intento presentado para revisar."
                        );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "No se pudo cargar la revisión del examen."
                      );
                    }
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Revisar
                </Button>
              )}{" "}
              {canManage && (
                <Button
                  variant="outline"
                  className="border-[#8B4D4D] bg-transparent text-[#E28A8A]"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "¿Eliminar este examen, sus preguntas, intentos y referencias de grabación?"
                      )
                    )
                      remove.mutate({ examId: row.exam.id });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
