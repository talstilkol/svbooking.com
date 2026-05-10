import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Agents',
  description: 'Automated deal scanning, health monitoring, and personalized hotel recommendations powered by AI agents.',
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
