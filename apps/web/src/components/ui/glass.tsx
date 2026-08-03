import { cn } from '@/utils/cn';

type GlassTone = 'light' | 'ink';
type GlassShape = 'panel' | 'pill' | 'none';

/** Liquid Glass surface — blur + tint + specular rim (Zettersten liquid-glass skill). */
export function Glass({
  children,
  className,
  contentClassName,
  tone = 'light',
  shape = 'panel',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: GlassTone;
  shape?: GlassShape;
  as?: 'div' | 'header' | 'footer' | 'section';
}) {
  return (
    <Tag
      className={cn(
        'glass',
        tone === 'ink' && 'glass--ink',
        shape === 'panel' && 'glass--panel',
        shape === 'pill' && 'glass--pill',
        className,
      )}
    >
      <div className="glass__refract" aria-hidden />
      <div className="glass__tint" aria-hidden />
      <div className="glass__specular" aria-hidden />
      <div className={cn('glass__content', contentClassName)}>{children}</div>
    </Tag>
  );
}

export function AmbientCanvas() {
  return (
    <div className="app-ambient" aria-hidden>
      <div className="app-ambient__orb app-ambient__orb--a" />
      <div className="app-ambient__orb app-ambient__orb--b" />
      <div className="app-ambient__orb app-ambient__orb--c" />
      <div className="app-ambient__grain" />
    </div>
  );
}
