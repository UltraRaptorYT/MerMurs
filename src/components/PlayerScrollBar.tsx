import React from "react";
import { Member } from "@/types";
import ProfilePictureDisplay from "./ProfilePictureDisplay";

interface PlayerScrollBarProps {
  members: Member[];
  uuid?: string;
}

export default function PlayerScrollBar({
  members,
  uuid = "",
}: PlayerScrollBarProps) {
  return (
    <div className="flex overflow-x-auto space-x-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex flex-col items-center px-2 pt-5 relative"
        >
          <ProfilePictureDisplay
            imageSrc={member.image}
            alt={member.name}
            width={48}
          />
          {member.uuid == uuid && (
            <div className="absolute rounded-full bg-green-500 w-3 h-3 bottom-4 right-2.5"></div>
          )}
          <span className="text-white text-xs font-bold text-ellipsis text-center overflow-hidden w-12">
            {member.name}
          </span>
        </div>
      ))}
    </div>
  );
}
