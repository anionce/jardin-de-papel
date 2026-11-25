import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export const SignOutButton = ({ onSignOut }: { onSignOut: () => void }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label="Cerrar sesión" onClick={() => setOpen(true)} className="text-muted-foreground">
        <LogOut />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-burgundy">¿Cerrar sesión?</DialogTitle>
            <DialogDescription>Para volver a ver tus libros tendrás que entrar otra vez con Google.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full">
              Cancelar
            </Button>
            <Button onClick={onSignOut} className="rounded-full bg-burgundy text-on-color hover:bg-burgundy/85">
              Cerrar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
