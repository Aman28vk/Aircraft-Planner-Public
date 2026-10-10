import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  subtitle?: string;
  showName?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'sm',
  className = '',
  subtitle,
  showName = false,
}) => {
  const getInitials = (n: string) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const getBgColor = (n: string) => {
    const colors = [
      'bg-sky-600 text-sky-100',
      'bg-emerald-600 text-emerald-100',
      'bg-amber-600 text-amber-100',
      'bg-purple-600 text-purple-100',
      'bg-indigo-600 text-indigo-100',
      'bg-rose-600 text-rose-100',
      'bg-teal-600 text-teal-100',
      'bg-blue-600 text-blue-100',
    ];
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const sizeStyles = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`rounded-full font-semibold flex items-center justify-center shrink-0 border border-slate-700/50 shadow-xs ${sizeStyles[size]} ${getBgColor(
          name
        )}`}
        title={name}
      >
        {getInitials(name)}
      </div>
      {showName && (
        <div className="flex flex-col text-left overflow-hidden">
          <span className="text-xs font-medium text-slate-200 truncate">{name}</span>
          {subtitle && <span className="text-[10px] text-slate-400 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

