type StepCardProps = {
  number: string;
  title: string;
  description: string;
};

export default function StepCard({
  number,
  title,
  description,
}: StepCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-6 text-5xl font-bold text-blue-600">
        {number}
      </div>

      <h3 className="text-xl font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}