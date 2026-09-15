import type { ChangeEvent } from "react";

type Question = { id: number; questionType: "open" | "single_choice" | "multiple_choice" | "true_false" | "fill_blank" | "matching" | "ordering"; options: string | null };

const optionClass = (selected: boolean) => selected
  ? "flex items-center gap-3 rounded-xl border-2 border-[#B69A5E] bg-[#B69A5E]/20 p-3 text-sm font-semibold text-[#F3E5BF] shadow-[0_0_0_2px_rgba(182,154,94,0.14)]"
  : "flex items-center gap-3 rounded-xl border border-[#3A4556] bg-[#151B18] p-3 text-sm text-[#DDE5EE] transition-colors hover:border-[#B69A5E]/70";

export function ExamQuestionInput({ question, value, onChange }: { question: Question; value: string; onChange: (value: string) => void }) {
  let options: string[] = [];
  try { options = question.options ? (JSON.parse(question.options) as unknown[]).map(String) : []; } catch { options = []; }
  if (question.questionType === "single_choice" || question.questionType === "true_false") {
    const availableOptions = question.questionType === "true_false" ? ["Verdadero", "Falso"] : options;
    return <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Opciones de respuesta">{availableOptions.map(option => {
      const selected = value === option;
      return <label key={option} className={optionClass(selected)}><input type="radio" name={`question-${question.id}`} value={option} checked={selected} onChange={() => onChange(option)} className="h-4 w-4 accent-[#B69A5E]" />{option}{selected && <span className="ml-auto rounded-full bg-[#B69A5E] px-2 py-0.5 text-[10px] font-bold uppercase text-[#171A17]">Elegida</span>}</label>;
    })}</div>;
  }
  if (question.questionType === "multiple_choice") {
    const selected = value ? value.split("||").filter(Boolean) : [];
    return <div className="mt-4 grid gap-2" role="group" aria-label="Opciones de respuesta múltiple">{options.map(option => {
      const isSelected = selected.includes(option);
      return <label key={option} className={optionClass(isSelected)}><input type="checkbox" value={option} checked={isSelected} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked ? [...selected, option].join("||") : selected.filter(item => item !== option).join("||"))} className="h-4 w-4 accent-[#B69A5E]" />{option}{isSelected && <span className="ml-auto rounded-full bg-[#B69A5E] px-2 py-0.5 text-[10px] font-bold uppercase text-[#171A17]">Elegida</span>}</label>;
    })}</div>;
  }
  return <textarea className="wij-input mt-4 min-h-24 py-3" placeholder={question.questionType === "fill_blank" ? "Completa la respuesta" : "Escribe tu respuesta"} value={value} onChange={event => onChange(event.target.value)} />;
}
