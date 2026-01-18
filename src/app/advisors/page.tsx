'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import AddAdvisorModal from '@/components/modals/AddAdvisorModal';
import { Advisor, Topic } from '@/types/database';
import { Plus, Users, Twitter, Linkedin, Youtube, Trash2, ExternalLink, LucideProps } from 'lucide-react';

const platformIcons: Record<string, React.ComponentType<LucideProps>> = {
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  twitter: '#3b82f6',
  linkedin: '#0077b5',
  youtube: '#ef4444',
};

const platformUrls: Record<string, (username: string) => string> = {
  twitter: (u) => `https://x.com/${u}`,
  linkedin: (u) => `https://linkedin.com/in/${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
};

export default function AdvisorsPage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [advisorsRes, topicsRes] = await Promise.all([
        fetch('/api/advisors'),
        fetch('/api/topics'),
      ]);
      const [advisorsData, topicsData] = await Promise.all([
        advisorsRes.json(),
        topicsRes.json(),
      ]);
      setAdvisors(advisorsData);
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdvisor = async (advisor: {
    name: string;
    platform: 'twitter' | 'linkedin' | 'youtube';
    username: string;
    avatar_url?: string;
    bio?: string;
    topic_id?: string;
  }) => {
    try {
      const res = await fetch('/api/advisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advisor),
      });
      const newAdvisor = await res.json();
      setAdvisors((prev) => [newAdvisor, ...prev]);
    } catch (error) {
      console.error('Failed to add advisor:', error);
    }
  };

  const handleDeleteAdvisor = async (id: string) => {
    if (!confirm('Are you sure you want to unfollow this advisor?')) return;

    try {
      await fetch(`/api/advisors?id=${id}`, { method: 'DELETE' });
      setAdvisors((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Failed to delete advisor:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Advisors</h1>
            <p className="text-white/60 mt-1">
              Follow thought leaders and industry experts
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="glass-button flex items-center gap-2 bg-accent hover:bg-accent/80"
          >
            <Plus className="w-5 h-5" />
            <span>Add Advisor</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : advisors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <Users className="w-16 h-16 mb-4" />
            <p className="text-lg">No advisors yet</p>
            <p className="text-sm mt-1">
              Follow thought leaders on X, LinkedIn, or YouTube
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advisors.map((advisor) => {
              const Icon = platformIcons[advisor.platform] || Twitter;
              const profileUrl = platformUrls[advisor.platform]?.(
                advisor.username
              );

              return (
                <div key={advisor.id} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    {advisor.avatar_url ? (
                      <img
                        src={advisor.avatar_url}
                        alt={advisor.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-accent font-semibold text-xl">
                          {advisor.name.charAt(0)}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{advisor.name}</h3>
                      <div className="flex items-center gap-1 text-white/40">
                        <Icon
                          className="w-4 h-4"
                          style={{ color: platformColors[advisor.platform] }}
                        />
                        <span className="text-sm">@{advisor.username}</span>
                      </div>
                    </div>
                  </div>

                  {advisor.bio && (
                    <p className="text-white/60 text-sm mt-3 line-clamp-2">
                      {advisor.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 glass-button flex items-center justify-center gap-2 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Profile</span>
                    </a>

                    <button
                      onClick={() => handleDeleteAdvisor(advisor.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddAdvisorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddAdvisor}
        topics={topics}
      />
    </div>
  );
}
