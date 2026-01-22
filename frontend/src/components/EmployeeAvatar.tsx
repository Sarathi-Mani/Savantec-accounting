import React from 'react';

interface EmployeeAvatarProps {
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function EmployeeAvatar({ 
  firstName, 
  lastName = '', 
  photoUrl, 
  size = 'md' 
}: EmployeeAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-20 h-20 text-2xl'
  };
  
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200 dark:border-gray-700`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = `${sizeClasses[size]} rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20`;
            fallbackDiv.innerHTML = `<span class="font-bold text-primary">${initials}</span>`;
            parent.appendChild(fallbackDiv);
          }
        }}
      />
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20`}>
      <span className="font-bold text-primary">{initials}</span>
    </div>
  );
}