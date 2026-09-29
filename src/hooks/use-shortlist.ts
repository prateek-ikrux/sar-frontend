import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import type { ApiError } from "@/lib/api"
import {
  addToShortlist,
  listShortlist,
  removeFromShortlist,
  saveShortlistNote,
} from "@/services/shortlist"
import { useAuthStore } from "@/stores/auth-store"
import type { SearchProfile, ShortlistItem } from "@/types"

const KEY = ["shortlist"] as const

/** What a search result looks like on the shortlist, until the server replies. */
const draftItem = (profile: SearchProfile, query: string): ShortlistItem => ({
  profileId: profile.id,
  fileName: profile.fileName,
  email: profile.email,
  phone: profile.phone,
  summary: profile.summary ?? { name: null, snippet: null, terms: [] },
  query,
  note: "",
  savedAt: new Date().toISOString(),
  resumeUrl: profile.resumeUrl ?? null,
  missing: false,
})

/**
 * The signed-in user's shortlist. Saving and removing update the list at
 * once and roll back if the server refuses; removing offers Undo rather than
 * asking first, since it's cheap to reverse.
 */
export function useShortlist() {
  const signedIn = useAuthStore((s) => Boolean(s.token))
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const list = useQuery({
    queryKey: KEY,
    queryFn: listShortlist,
    enabled: signedIn,
    staleTime: 30_000,
  })

  const items = list.data ?? []
  const savedIds = new Set(items.map((item) => item.profileId))

  const current = () => queryClient.getQueryData<ShortlistItem[]>(KEY) ?? []
  const write = (update: (items: ShortlistItem[]) => ShortlistItem[]) =>
    queryClient.setQueryData<ShortlistItem[]>(KEY, (old) => update(old ?? []))

  const add = useMutation({
    mutationFn: ({ item }: { item: ShortlistItem; undoing?: boolean }) =>
      addToShortlist({ profileId: item.profileId, query: item.query, note: item.note || undefined }),
    onMutate: async ({ item }) => {
      await queryClient.cancelQueries({ queryKey: KEY })
      const before = current()
      write((old) => [item, ...old.filter((i) => i.profileId !== item.profileId)])
      return { before }
    },
    onSuccess: (saved, { undoing }) => {
      write((old) => old.map((i) => (i.profileId === saved.profileId ? saved : i)))
      if (!undoing) {
        // One toast however many are saved in a row, not a stack.
        toast.success("Saved to your shortlist", {
          id: "shortlist-saved",
          action: { label: "View", onClick: () => navigate("/shortlist") },
        })
      }
    },
    onError: (error: ApiError, _vars, context) => {
      if (context) queryClient.setQueryData(KEY, context.before)
      toast.error(error.message, { description: error.detail })
    },
  })

  const remove = useMutation({
    mutationFn: (item: ShortlistItem) => removeFromShortlist(item.profileId),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: KEY })
      const before = current()
      write((old) => old.filter((i) => i.profileId !== item.profileId))
      return { before }
    },
    onSuccess: (_data, item) => {
      toast.success("Removed from your shortlist", {
        id: `shortlist-removed-${item.profileId}`,
        action: { label: "Undo", onClick: () => add.mutate({ item, undoing: true }) },
      })
    },
    onError: (error: ApiError, _item, context) => {
      // Already gone (another tab) is the outcome that was asked for.
      if (error.status === 404) return
      if (context) queryClient.setQueryData(KEY, context.before)
      toast.error(error.message, { description: error.detail })
    },
  })

  const note = useMutation({
    mutationFn: ({ profileId, text }: { profileId: string; text: string }) =>
      saveShortlistNote(profileId, text),
    onSuccess: (saved, { profileId }) => {
      write((old) => old.map((i) => (i.profileId === profileId ? { ...i, note: saved } : i)))
    },
  })

  return {
    items,
    isPending: list.isPending && signedIn,
    error: list.error as ApiError | null,
    isSaved: (profileId: string) => savedIds.has(profileId),
    /** Saves a search result, or removes it if it's already saved. */
    toggle(profile: SearchProfile, query: string) {
      const saved = current().find((i) => i.profileId === profile.id)
      if (saved) remove.mutate(saved)
      else add.mutate({ item: draftItem(profile, query) })
    },
    remove: (item: ShortlistItem) => remove.mutate(item),
    /** Resolves once saved; rejects with an ApiError the caller shows inline. */
    saveNote: (profileId: string, text: string) => note.mutateAsync({ profileId, text }),
  }
}
