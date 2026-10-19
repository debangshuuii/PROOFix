'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { JourneyEditor } from '@/components/journey/JourneyEditor';
import { UserJourney } from '@/lib/types/journey';

export default function JourneyEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const journeyId = params.journeyId as string;

  const [journey, setJourney] = useState<UserJourney | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/journeys/${journeyId}`);
        if (res.ok) {
          const json = await res.json();
          setJourney(json.journey);
        } else {
          // Initialize fresh blank journey for editor
          const now = new Date().toISOString();
          setJourney({
            id: journeyId === 'new' ? `jny_${Date.now()}` : journeyId,
            projectId,
            ownerId: 'usr_default',
            title: 'New Visual User Journey',
            description: 'Automated end-to-end browser verification flow created visually.',
            schemaVersion: '1.0.0',
            steps: [
              {
                id: 'stp_init',
                order: 1,
                title: 'Open Home Page',
                action: 'navigate',
                params: { url: '/' },
              },
            ],
            config: {
              baseUrl: 'http://localhost:4173',
              allowedHosts: ['localhost', '127.0.0.1'],
              defaultTimeoutMs: 10000,
              viewport: { width: 1280, height: 720 },
              stopOnFailure: true,
            },
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (err) {
        console.error('Error loading journey:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId, journeyId]);

  const handleSave = async (updated: UserJourney) => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/journeys/${updated.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        if (journeyId === 'new') {
          router.replace(`/projects/${projectId}/journeys/${updated.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to save journey:', err);
    }
  };

  if (loading || !journey) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-slate-400 text-xs">Loading Journey Editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <JourneyEditor
          initialJourney={journey}
          onSave={handleSave}
          onRun={(j) => router.push(`/projects/${projectId}/journeys/${j.id}/run`)}
        />
      </main>
    </div>
  );
}
