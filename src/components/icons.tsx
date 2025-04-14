import React from "react";
import { Twitter, Github, Moon, Sun, Heart, Search } from "lucide-react";

import { IconSvgProps } from "@/types";

// Keep custom Logo
export const Logo: React.FC<IconSvgProps> = ({
  size = 36,
  height,
  ...props
}) => (
  <svg
    fill="none"
    height={size || height}
    viewBox="0 0 32 32"
    width={size || height}
    {...props}
  >
    <path
      clipRule="evenodd"
      d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

// Keep custom Discord icon if Lucide doesn't have a direct equivalent
export const DiscordIcon: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  ...props
}) => {
  return (
    <svg
      height={size || height}
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path
        d="M14.82 4.26a10.14 10.14 0 0 0-.53 1.1 14.66 14.66 0 0 0-4.58 0 10.14 10.14 0 0 0-.53-1.1 16 16 0 0 0-4.13 1.3 17.33 17.33 0 0 0-3 11.59 16.6 16.6 0 0 0 5.07 2.59A12.89 12.89 0 0 0 8.23 18a9.65 9.65 0 0 1-1.71-.83 3.39 3.39 0 0 0 .42-.33 11.66 11.66 0 0 0 10.12 0q.21.18.42.33a10.84 10.84 0 0 1-1.71.84 12.41 12.41 0 0 0 1.08 1.78 16.44 16.44 0 0 0 5.06-2.59 17.22 17.22 0 0 0-3-11.59 16.09 16.09 0 0 0-4.09-1.35zM8.68 14.81a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.93 1.93 0 0 1 1.8 2 1.93 1.93 0 0 1-1.8 2zm6.64 0a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.92 1.92 0 0 1 1.8 2 1.92 1.92 0 0 1-1.8 2z"
        fill="currentColor"
      />
    </svg>
  );
};

// Use Lucide icons, passing props like size and className
export const TwitterIcon: React.FC<IconSvgProps> = ({ size = 24, width, height, className, ...props }) => (
  <Twitter size={size || width || height} className={className} {...props} />
);

export const GithubIcon: React.FC<IconSvgProps> = ({ size = 24, width, height, className, ...props }) => (
  <Github size={size || width || height} className={className} {...props} />
);

export const MoonFilledIcon: React.FC<IconSvgProps> = ({ size = 24, width, height, className, ...props }) => (
  <Moon size={size || width || height} className={className} fill="currentColor" {...props} />
);

export const SunFilledIcon: React.FC<IconSvgProps> = ({ size = 24, width, height, className, ...props }) => (
  <Sun size={size || width || height} className={className} fill="currentColor" {...props} />
);

export const HeartFilledIcon: React.FC<IconSvgProps> = ({ size = 24, width, height, className, ...props }) => (
  <Heart size={size || width || height} className={className} fill="currentColor" {...props} />
);

export const SearchIcon: React.FC<IconSvgProps> = ({ size = 20, width, height, className, ...props }) => (
  // Adjusted default size slightly to match common usage for search icons
  <Search size={size || width || height || '1em'} className={className} {...props} /> 
);
