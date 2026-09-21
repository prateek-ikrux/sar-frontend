import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { summarise } from "@/lib/resume"
import type { SearchResult } from "@/types"

type Props = {
  result: SearchResult | null
  onOpenChange: (open: boolean) => void
}

export function ResultDialog({ result, onOpenChange }: Props) {
  const summary = result ? summarise(result.document) : null

  return (
    <Dialog open={Boolean(result)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{summary?.name ?? result?.email}</DialogTitle>
          <DialogDescription>{result?.file_name}</DialogDescription>
        </DialogHeader>
        <div className="-mx-6 overflow-y-auto px-6">
          {result && (
            <div className="prose-resume">
              <Markdown remarkPlugins={[remarkGfm]}>{result.document}</Markdown>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
