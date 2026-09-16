type CaseProgressTrackerProps = {
  status: string | null;
};

const stages = [
  {
    key: "submitted",
    label: "Submitted",
  },
  {
    key: "under_review",
    label: "Under review",
  },
  {
    key: "approved",
    label: "Approved",
  },
  {
    key: "attorney_assigned",
    label: "Attorney assigned",
  },
  {
    key: "consultation_scheduled",
    label: "Consultation",
  },
  {
    key: "documents_requested",
    label: "Documents",
  },
  {
    key: "filing_prepared",
    label: "Filing prepared",
  },
  {
    key: "filed",
    label: "Filed",
  },
  {
    key: "negotiation",
    label: "Negotiation",
  },
  {
    key: "hearing",
    label: "Hearing",
  },
  {
    key: "resolved",
    label: "Resolved",
  },
  {
    key: "closed",
    label: "Closed",
  },
];

export default function CaseProgressTracker({
  status,
}: CaseProgressTrackerProps) {
  const normalizedStatus =
    status?.trim().toLowerCase() || "submitted";

  const currentIndex = stages.findIndex(
    (stage) => stage.key === normalizedStatus,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
          Current progress
        </p>

        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink-950">
          Case journey
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Follow the case as it moves through each legal stage.
        </p>
      </div>

      <div className="mt-8 overflow-x-auto pb-2">
        <div className="flex min-w-max items-start">
          {stages.map((stage, index) => {
            const completed =
              currentIndex >= 0 && index < currentIndex;

            const current =
              index === currentIndex;

            return (
              <div
                key={stage.key}
                className="flex items-start"
              >
                <div className="w-32 shrink-0">
                  <div className="flex items-center">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        completed
                          ? "border-brand-500 bg-brand-500 text-white"
                          : current
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </div>

                    {index !== stages.length - 1 && (
                      <div
                        className={`h-0.5 w-[92px] ${
                          currentIndex > index
                            ? "bg-brand-500"
                            : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>

                  <p
                    className={`mt-3 max-w-[110px] text-sm leading-5 ${
                      current
                        ? "font-semibold text-ink-950"
                        : completed
                          ? "font-medium text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {stage.label}
                  </p>

                  {current && (
                    <span className="mt-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      Current
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}