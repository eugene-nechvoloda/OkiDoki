import logoV1 from '@/assets/logos/okidoki-logo.png';
import logoV2 from '@/assets/logos/okidoki-logo-v2.png';
import logoV3 from '@/assets/logos/okidoki-logo-v3.png';
import logoV4 from '@/assets/logos/okidoki-logo-v4.png';

export default function LogoPreview() {
  const logos = [
    { name: 'Original (V1)', src: logoV1 },
    { name: 'V2 - Elegant Curve', src: logoV2 },
    { name: 'V3 - Brushstroke', src: logoV3 },
    { name: 'V4 - App Icon', src: logoV4 },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold text-center mb-8">OkiDoki Logo Variations</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
        {logos.map((logo) => (
          <div key={logo.name} className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 bg-muted rounded-xl flex items-center justify-center p-4">
              <img src={logo.src} alt={logo.name} className="max-w-full max-h-full object-contain" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{logo.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
