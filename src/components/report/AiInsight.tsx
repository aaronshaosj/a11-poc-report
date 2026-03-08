interface AiInsightProps {
  text: string;
}

export default function AiInsight({ text }: AiInsightProps) {
  return (
    <div className="mt-3 pl-3 border-l-2 border-accent-blue/40 flex gap-2">
      <span className="shrink-0 text-[10px] font-semibold bg-accent-blue/15 text-accent-blue px-1.5 py-0.5 rounded mt-0.5">
        AI
      </span>
      <p className="text-xs leading-relaxed text-text-secondary">{text}</p>
    </div>
  );
}
