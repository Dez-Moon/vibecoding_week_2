"use client"

import { useState } from "react"
import { LogOut, FileText, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MyDocumentsModal } from "@/components/my-documents-modal"

export function UserMenu() {
  const { user, loading, signOut } = useAuth()
  const [docsOpen, setDocsOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

  if (loading) {
    return <div className="w-8" />
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/auth/login")}
        >
          Sign in
        </Button>
        <Button
          size="sm"
          onClick={() => router.push("/auth/register")}
        >
          Sign up
        </Button>
      </div>
    )
  }

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:block">{user.name || user.email}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user.name || "My Account"}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDocsOpen(true)} className="cursor-pointer">
            <FileText className="size-4 mr-2" />
            My Documents
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            disabled={signingOut}
            className="cursor-pointer data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10"
          >
            {signingOut ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="size-4 mr-2" />
            )}
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MyDocumentsModal open={docsOpen} onOpenChange={setDocsOpen} />
    </>
  )
}
