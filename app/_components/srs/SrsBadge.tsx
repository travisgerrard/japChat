import React from "react";

interface SrsBadgeProps {
  level: number;
  nextReview: string;
}

export default function SrsBadge({ level, nextReview }: SrsBadgeProps) {
  let color = 'bg-gray-300 text-gray-800';
  if (level > 3) color = 'bg-green-400 text-white';
  else if (level > 0) color = 'bg-blue-400 text-white';
  else color = 'bg-red-400 text-white';
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${color} cursor-help`}
      title={`Next review: ${nextReview ? new Date(nextReview).toLocaleDateString() : 'N/A'}`}
    >
      {level}
    </span>
  );
} 