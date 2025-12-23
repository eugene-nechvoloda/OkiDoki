import React from "react";

export const ConfluenceLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 256 246" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="confluenceGradient1" x1="99.141%" x2="24.757%" y1="112.745%" y2="17.541%">
        <stop offset="0%" stopColor="#0052CC"/>
        <stop offset="92.3%" stopColor="#2684FF"/>
      </linearGradient>
      <linearGradient id="confluenceGradient2" x1="0.853%" x2="75.231%" y1="-12.745%" y2="82.459%">
        <stop offset="0%" stopColor="#0052CC"/>
        <stop offset="92.3%" stopColor="#2684FF"/>
      </linearGradient>
    </defs>
    <path d="M9.26 187.63c-4.12 6.75-8.66 14.68-12.07 20.24a8 8 0 0 0 2.67 10.98l47.42 29a8 8 0 0 0 11-2.56c2.91-4.71 6.68-10.93 10.62-17.5 18.09-30.22 36.37-26.6 69.45-11.62l47.74 21.58a8 8 0 0 0 10.49-4.27l23.15-55.88a8 8 0 0 0-4.19-10.39l-47.31-21.37c-60.75-27.48-113.1-25.21-158.97 41.79z" fill="url(#confluenceGradient1)"/>
    <path d="M246.11 58.24c4.12-6.75 8.66-14.68 12.07-20.24a8 8 0 0 0-2.67-10.98l-47.42-29a8 8 0 0 0-11 2.56c-2.91 4.71-6.68 10.93-10.62 17.5-18.09 30.22-36.37 26.6-69.45 11.62L69.28 8.12a8 8 0 0 0-10.49 4.27L35.64 68.27a8 8 0 0 0 4.19 10.39l47.31 21.37c60.75 27.48 113.1 25.21 158.97-41.79z" fill="url(#confluenceGradient2)"/>
  </svg>
);

export const LinearLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 98.1772c.6889.6889.0915 1.8189-.857 1.5765C21.8435 95.1872 4.8918 78.1567 1.22541 61.5228zM.00189631 46.8891c-.01764375.2833.08887215.5599.28957765.7606l52.060344 52.0604c.2007.2007.4773.3072.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9516.7166-.1552.9714-1.0236.4476-1.5475L3.49388 40.4883C2.97 39.9645 2.10156 40.2193 1.94632 40.9359c-.49168 2.2686-.80417 4.5932-.94442381 6.9532zM4.50155 30.8767c-.18012.1154-.31353.2918-.37678.4975-.53436 1.7374-.9772 3.5078-1.32553 5.3055-.1397.7208.46633 1.3717 1.19052 1.2833.10174-.0124.20114-.0485.2892-.1065l55.2755-36.8503C61.0312.82197 62.5926.162096 64.1819.0619399 64.5157.0402614 64.794-.2332 64.794-.5667V.0618946C64.794.0173147 64.7514-.0199571 64.7068-.0157841 41.6312 2.26067 20.4494 12.6971 4.50155 30.8767zM64.794 14.7458V5.60738c0-.60952-.7578-.88965-1.1803-.43645L15.5314 56.0474c-.6141.6586-.1596 1.7493.7377 1.7493h9.1844c.2529 0 .4957-.1004.6746-.2793L64.794 14.7458zM22.7931 69.5765c-.5765 0-.8878.6764-.5131 1.1153l16.0367 18.8541c.1881.2211.4647.3481.7565.3481H81.224c.5765 0 .8878-.6764.5131-1.1152L22.7931 69.5765zM91.4553 82.0374 42.5597 31.2318c-.1947-.2024-.3009-.4728-.2954-.7516l.4953-25.0842c.0122-.62.5949-.9869 1.1584-.7295l34.5209 15.7639c.2119.0968.3858.2652.4895.4738L99.9454 63.9355c.2626.5285.0209 1.1658-.5267 1.3887l-7.6174 3.1021c-.5477.223-1.1716-.0277-1.3738-.5546L70.4001 16.0668l-21.1655-9.6703-.4182 21.1793L91.4553 82.0374z" fill="#5E6AD2"/>
  </svg>
);

export const GammaLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#0A21C0"/>
    <path d="M10 12h10c4.418 0 8 3.582 8 8v0c0 4.418-3.582 8-8 8H10V12z" stroke="white" strokeWidth="3" fill="none"/>
    <path d="M10 28h0" stroke="white" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const NapkinLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#6366F1"/>
    <path d="M12 14L20 26L28 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="20" cy="20" r="2" fill="white"/>
  </svg>
);

export const IntegrationLogo: React.FC<{ 
  provider: "confluence" | "linear" | "gamma" | "napkin";
  className?: string;
}> = ({ provider, className = "w-6 h-6" }) => {
  switch (provider) {
    case "confluence":
      return <ConfluenceLogo className={className} />;
    case "linear":
      return <LinearLogo className={className} />;
    case "gamma":
      return <GammaLogo className={className} />;
    case "napkin":
      return <NapkinLogo className={className} />;
    default:
      return null;
  }
};
