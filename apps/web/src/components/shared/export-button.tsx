'use client';

import { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  onClick: () => void;
  className?: string;
}

export function ExportButton({ onClick, className }: ExportButtonProps) {
  const [showFeedback, setShowFeedback] = useState(false);

  const handleClick = () => {
    onClick();
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      className={cn(
        'gap-1.5 border border-sunshine-200 bg-sunshine-200/40 text-sunshine-800 hover:bg-sunshine-200/70',
        className
      )}
    >
      {showFeedback ? (
        <>
          <Check className="h-4 w-4" />
          Downloaded!
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export CSV
        </>
      )}
    </Button>
  );
}
