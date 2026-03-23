import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <h1 className="text-3xl font-bold tracking-tight text-sunshine-900">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-sunshine-700">{description}</p>
      )}
    </div>
  );
}
