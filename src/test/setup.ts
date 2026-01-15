import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client for tests
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          neq: vi.fn(() => Promise.resolve({ count: 0 })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        })),
        in: vi.fn(() => ({
          neq: vi.fn(() => Promise.resolve({ count: 0 })),
        })),
      })),
    })),
  },
}));
