import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BQA Admin — Bible Quiz Automation',
  description: 'Admin portal for the Bible Quiz Automation WhatsApp system.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
