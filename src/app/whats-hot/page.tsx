'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import SubscribeWidget from '@/components/widgets/SubscribeWidget';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Topic, WhatsHotPost } from '@/types/database';
import { Flame, ExternalLink, Calendar, ChevronLeft, ChevronRight, Twitter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { authFetch } from '@/lib/api';

interface WhatsHotPostWithTopic extends WhatsHotPost {
  topics?: Topic | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function WhatsHotPage() {
  const [posts, setPosts] = useState<WhatsHotPostWithTopic[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchTopics = async () => {
    try {
      const res = await authFetch('/api/topics');
      const data = await res.json();
      setTopics(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (selectedTopic) {
        params.set('topic_id', selectedTopic);
      }

      const res = await fetch(`/api/publish?${params}`);
      const data = await res.json();

      setPosts(data.posts || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedTopic]);

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleTopicChange = (topicId: string | null) => {
    setSelectedTopic(topicId);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <Header />

        <div className="flex-1 overflow-auto p-3 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Flame className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">What&apos;s Hot</h1>
                <p className="text-white/60">Curated content from our intelligence feed</p>
              </div>
            </div>

          {/* Topic Filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => handleTopicChange(null)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                !selectedTopic
                  ? 'bg-accent text-white'
                  : 'glass-button text-white/70 hover:text-white'
              }`}
            >
              All Topics
            </button>
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicChange(topic.id)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  selectedTopic === topic.id
                    ? 'text-white'
                    : 'glass-button text-white/70 hover:text-white'
                }`}
                style={{
                  backgroundColor:
                    selectedTopic === topic.id ? topic.color || '#0ea5e9' : undefined,
                }}
              >
                {topic.name}
              </button>
            ))}
          </div>

          {/* Posts List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <Flame className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">No posts yet</p>
              <p className="text-white/30 text-sm mt-1">
                Published content will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="glass-card p-5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex gap-4">
                    {post.thumbnail_url && (
                      <div className="hidden sm:block w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={post.thumbnail_url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.topics && (
                            <span
                              className="px-2 py-0.5 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: `${post.topics.color || '#0ea5e9'}20`,
                                color: post.topics.color || '#0ea5e9',
                              }}
                            >
                              {post.topics.name}
                            </span>
                          )}
                          {post.x_post_id && (
                            <span className="flex items-center gap-1 text-xs text-[#1DA1F2]">
                              <Twitter className="w-3 h-3" />
                              Posted
                            </span>
                          )}
                        </div>
                      </div>

                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-accent transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                      </a>

                      <p className="text-white/60 text-sm mb-3 line-clamp-2">{post.summary}</p>

                      <div className="flex items-center justify-between text-xs text-white/40">
                        <div className="flex items-center gap-4">
                          {post.author && <span>by {post.author}</span>}
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDistanceToNow(new Date(post.published_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>

                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-accent hover:underline"
                        >
                          Read more
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {post.hashtags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs text-accent/70"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg glass-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-white/60">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg glass-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

            {/* Subscribe Widget */}
            <SubscribeWidget source="whats-hot" className="mt-8" />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
