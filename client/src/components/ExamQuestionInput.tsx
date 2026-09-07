import type { ChangeEvent } from "react";

type Question = { questionType: "open" | "single_choice" | "multiple_choice" | "true_false" | "fill_blank" | "matching" | "ordering"; options: string | null };

export function ExamQuestionInput({ question, value, onChange }: { question: Question; value: string; onChange: (value: string) => void }) {
  let options: string[] = [];
  try { options = question.options ? (JSON.parse(question.options) as unknown[]).map(String) : []; } catch { options = []; }
  if (question.questionType === "single_choice" || question.questionType === "true_false") return <div className="mt-4 grid gap-2">{(question.questionType === "true_false" ? ["Verdadero", "Falso"] : options).map(option => <label key={option} className="flex items-center gap-2 rounded-xl border border-[#3A4556] bg-[#151B18] p-3 text-sm text-[#DDE5EE]"><input type="radio" name={`question-${question}`} checked={value === option} onChange={() => onChange(option)} />{option}</label>)}</div>;
  if (question.questionType === "multiple_choice") { const selected = value ? value.split("||") : []; return <div className="mt-4 grid gap-2">{options.map(option => <label key={option} className="flex items-center gap-2 rounded-xl border border-[#3A4556] bg-[#151B18] p-3 text-sm text-[#DDE5EE]"><input type="checkbox" checked={selected.includes(option)} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked ? [...selected, option].join("||") : selected.filter(item => item !== option).join("||"))} />{option}</label>)}</div>; }
  return <textarea className="wij-input mt-4 min-h-24 py-3" placeholder={question.questionType === "fill_blank" ? "Completa la respuesta" : "Escribe tu respuesta"} value={value} onChange={event => onChange(event.target.value)} />;
}
