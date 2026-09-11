export const metadata = {
  title: 'GearCore',
  description: 'El núcleo operativo de tu taller',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
