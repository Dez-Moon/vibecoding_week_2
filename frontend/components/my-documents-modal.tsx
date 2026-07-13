"use client"

import { useQuery } from "@tanstack/react-query"
import { FileText, Trash2, Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { listDocuments, deleteDocument } from "@/lib/api-auth"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"

interface MyDocumentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectDocument?: (docId: number) => void
}

export function MyDocumentsModal({ open, onOpenChange, onSelectDocument }: MyDocumentsModalProps) {
  const { user } = useAuth()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: docs, isLoading, isError, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: listDocuments,
    enabled: !!user && open,
  })

  async function handleDelete(id: number) {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteDocument(id)
      setDeleteId(null)
      refetch()
    } catch {
      setDeleteError("Failed to delete document. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              My Documents
            </DialogTitle>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive" className="mt-2 py-2 text-xs">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <div className="mt-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-sm font-medium text-destructive">Failed to load documents</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : !docs?.length ? (
              <div className="text-center py-12">
                <FileText className="size-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">No documents yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a document and save it to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => onSelectDocument ? onSelectDocument(doc.id) : onOpenChange(false)}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 pl-6">
                        <span className="text-xs text-muted-foreground">{doc.doc_type}</span>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 ml-2"
                      onClick={() => setDeleteId(doc.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
