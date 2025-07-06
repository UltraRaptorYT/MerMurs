import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ProfilePictureDisplayProps = {
  imageSrc: string;
  width: number; // Avatar circle size in px
} & React.HTMLAttributes<HTMLDivElement>; // Accepts all standard div props

export default function ProfilePictureDisplay({
  imageSrc,
  width,
  className,
  ...props
}: ProfilePictureDisplayProps) {
  return (
    <div
      className={cn(
        `relative rounded-full border-4 border-white flex items-end justify-center overflow-visible bg-white`,
        className
      )}
      style={{ width: `${width}px`, height: `${width}px` }}
      {...props}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          width: `${width * 1}px`, // Make image container larger than parent
        }}
      >
        <Image
          src={imageSrc}
          alt="Profile Picture"
          width={width * 1.5} // Match the custom container width
          height={width * 1.5} // Keep it square
          className="w-full h-auto object-contain"
        />
      </div>
    </div>
  );
}
