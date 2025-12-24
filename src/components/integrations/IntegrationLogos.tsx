import React from "react";
import linearLogo from "@/assets/logos/linear.png";
import gammaLogo from "@/assets/logos/gamma.png";
import napkinLogo from "@/assets/logos/napkin.png";

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
  <img src={linearLogo} alt="Linear" className={className} />
);

export const GammaLogo: React.FC<{ className?: string }> = ({ className }) => (
  <img src={gammaLogo} alt="Gamma" className={className} />
);

export const NapkinLogo: React.FC<{ className?: string }> = ({ className }) => (
  <img src={napkinLogo} alt="Napkin AI" className={className} />
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
