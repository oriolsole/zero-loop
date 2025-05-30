
import React from 'react';

interface JiraIconProps {
  className?: string;
}

const JiraIcon: React.FC<JiraIconProps> = ({ className = "h-4 w-4" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="jira-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0052CC" />
          <stop offset="100%" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path
        d="M11.53 2c0 2.4-1.97 4.35-4.35 4.35H5.35L2.29 9.41c-.78.78-.78 2.05 0 2.83l6.24 6.24c.78.78 2.05.78 2.83 0L18.59 11.24c.78-.78.78-2.05 0-2.83L12.35 2.17c-.22-.22-.51-.17-.82-.17z"
        fill="url(#jira-gradient)"
      />
      <path
        d="M20.41 9.41L17.35 6.35H15.53c-2.4 0-4.35-1.97-4.35-4.35V2c0-.31-.05-.6-.17-.82L5.76 6.43c-.78.78-.78 2.05 0 2.83l6.24 6.24c.78.78 2.05.78 2.83 0l6.24-6.24c.78-.78.78-2.05 0-2.83z"
        fill="#0052CC"
        opacity="0.8"
      />
    </svg>
  );
};

export default JiraIcon;
