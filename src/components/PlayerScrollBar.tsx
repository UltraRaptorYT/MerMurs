import React from "react";
import { Member } from "@/types";
import ProfilePictureDisplay from "./ProfilePictureDisplay";

interface MemberScrollBarProps {
  members: Member[];
}

export default function MemberScrollBar({ members }: MemberScrollBarProps) {
  return (
    <div className="flex overflow-x-auto space-x-2">
      {members.map((member) => (
        <div key={member.id} className="flex flex-col items-center px-2 pt-5">
          <ProfilePictureDisplay
            imageSrc={member.image}
            alt={member.name}
            width={48}
          />
          <span className="text-white text-xs font-bold text-ellipsis text-center overflow-hidden w-12">{member.name}</span>
        </div>
      ))}
    </div>
  );
}
