import Image from 'next/image';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AvatarProps {
  username: string;
  photoURL?: string | null;
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
  className?: string;
}

const sizes = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-lg' },
};

export default function Avatar({ username, photoURL, size = 'md', isActive, className }: AvatarProps) {
  const s = sizes[size];
  return (
    <div
      className={cn(
        s.container,
        'relative rounded-full overflow-hidden shrink-0',
        isActive && 'turn-glow ring-2 ring-white/50',
        className
      )}
    >
      {photoURL ? (
        <Image src={photoURL} alt={username} fill className="object-cover" />
      ) : (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center font-semibold text-white',
            'bg-gradient-to-br from-pink-soft to-lavender-deep',
            s.text
          )}
        >
          {getInitials(username)}
        </div>
      )}
    </div>
  );
}
