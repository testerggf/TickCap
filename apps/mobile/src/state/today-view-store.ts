import { create } from 'zustand'

export interface BackfillSelection {
  startAt: string
  endAt: string
  minutes: number
}

export interface SealPreviewState {
  date: string
  streak: number
  capsuleCount: number
  contentMd: string
}

interface TodayViewState {
  draft: string
  editingId: string | null
  editSummary: string
  backfill: BackfillSelection | null
  backfillSummary: string
  feedback: string
  sealPreview: SealPreviewState | null
  sealStep: 'replay' | 'review' | 'done'
  sealNote: string
  sealedStreak: number | null
  setDraft: (draft: string) => void
  openEditor: (id: string, summary: string) => void
  closeEditor: () => void
  setEditSummary: (editSummary: string) => void
  openBackfill: (backfill: BackfillSelection) => void
  closeBackfill: () => void
  setBackfillSummary: (backfillSummary: string) => void
  setFeedback: (feedback: string) => void
  openSeal: (sealPreview: SealPreviewState) => void
  showSealReview: () => void
  setSealNote: (sealNote: string) => void
  completeSeal: (sealedStreak: number) => void
  closeSeal: () => void
}

export const useTodayViewStore = create<TodayViewState>()((set) => ({
  draft: '',
  editingId: null,
  editSummary: '',
  backfill: null,
  backfillSummary: '',
  feedback: '',
  sealPreview: null,
  sealStep: 'replay',
  sealNote: '',
  sealedStreak: null,
  setDraft: (draft) => set({ draft }),
  openEditor: (editingId, editSummary) => set({ editingId, editSummary }),
  closeEditor: () => set({ editingId: null, editSummary: '' }),
  setEditSummary: (editSummary) => set({ editSummary }),
  openBackfill: (backfill) => set({ backfill, backfillSummary: '' }),
  closeBackfill: () => set({ backfill: null, backfillSummary: '' }),
  setBackfillSummary: (backfillSummary) => set({ backfillSummary }),
  setFeedback: (feedback) => set({ feedback }),
  openSeal: (sealPreview) =>
    set({
      sealPreview,
      sealStep: 'replay',
      sealNote: '',
      sealedStreak: null,
    }),
  showSealReview: () => set({ sealStep: 'review' }),
  setSealNote: (sealNote) => set({ sealNote }),
  completeSeal: (sealedStreak) => set({ sealStep: 'done', sealedStreak }),
  closeSeal: () =>
    set({
      sealPreview: null,
      sealStep: 'replay',
      sealNote: '',
      sealedStreak: null,
    }),
}))
