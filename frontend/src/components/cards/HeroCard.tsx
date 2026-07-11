import React from 'react';
import { Button } from '../ui/button';

interface HeroCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  badgeText?: string;
  illustration?: React.ReactNode;
  className?: string;
}

export function HeroCard({
  title,
  description,
  actionLabel,
  onAction,
  badgeText,
  illustration,
  className = '',
}: HeroCardProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 text-foreground shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-primary ${className}`}
    >
      {/* Decorative Background Glows */}
      <div className="absolute -right-16 -top-16 -z-10 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 -z-10 size-48 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-4 text-left">
          {badgeText && (
            <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent uppercase tracking-wider">
              {badgeText}
            </span>
          )}
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            {title}
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-md font-medium leading-relaxed">
            {description}
          </p>
          {actionLabel && (
            <div className="pt-2">
              <Button onClick={onAction} className="shadow-md">
                {actionLabel}
              </Button>
            </div>
          )}
        </div>

        {illustration && (
          <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 flex items-center justify-center pointer-events-none">
            {illustration}
          </div>
        )}
      </div>
    </div>
  );
}
