// import React from "react";

type StepItem = { id: string; label: string };

export default function Steps({ steps, current }: { steps: StepItem[]; current: string }) {
  return (
    <ol className="flex items-center w-full">
      {steps.map((s, idx) => {
        const active = s.id === current;
        return (
          <li key={s.id} className="flex-1 flex items-center">
            <div className={`flex items-center gap-2 ${active ? 'text-orange-600' : 'text-gray-500'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${active ? 'bg-orange-100' : 'bg-gray-100'}`}>{idx+1}</span>
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            {idx < steps.length - 1 && <div className={`h-px flex-1 mx-3 ${active ? 'bg-orange-400' : 'bg-gray-200'}`}></div>}
          </li>
        );
      })}
    </ol>
  );
}
