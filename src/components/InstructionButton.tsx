import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import React from "react";
import Instructions from "@/components/Instructions";

export default function InstructionButton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={"ghost"}
          size={"icon"}
          className={cn(className, "absolute top-3 right-2.5")}
          {...rest} // Spread remaining props like id, onClick, style
        >
          <Info className="size-8" strokeWidth={2.5} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
          <Instructions />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
