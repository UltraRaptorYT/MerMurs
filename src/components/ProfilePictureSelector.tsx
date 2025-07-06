"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import ProfilePictureDisplay from "@/components/ProfilePictureDisplay";
import { Button } from "@/components/ui/button";

const profilePictures = [
  "/profile/0.svg",
  "/profile/1.svg",
  "/profile/2.svg",
  "/profile/3.svg",
  "/profile/4.svg",
  "/profile/5.svg",
  "/profile/6.svg",
  "/profile/7.svg",
  "/profile/8.svg",
  "/profile/9.svg",
  "/profile/10.svg",
  "/profile/11.svg",
  "/profile/12.svg",
  "/profile/13.svg",
  "/profile/14.svg",
  "/profile/15.svg",
  "/profile/16.svg",
  "/profile/17.svg",
  "/profile/18.svg",
  "/profile/19.svg",
  "/profile/20.svg",
  "/profile/21.svg",
  "/profile/22.svg",
  "/profile/23.svg",
  "/profile/24.svg",
  "/profile/25.svg",
  "/profile/26.svg",
  "/profile/27.svg",
  "/profile/28.svg",
  "/profile/29.svg",
  "/profile/30.svg",
  "/profile/31.svg",
  "/profile/32.svg",
  "/profile/33.svg",
  "/profile/34.svg",
  "/profile/35.svg",
  "/profile/36.svg",
  "/profile/37.svg",
  "/profile/38.svg",
  "/profile/39.svg",
  "/profile/40.svg",
  "/profile/41.svg",
  "/profile/42.svg",
  "/profile/43.svg",
  "/profile/44.svg",
  "/profile/45.svg",
  "/profile/46.svg",
];

export default function ProfilePictureSelector() {
  const [selectedPicture, setSelectedPicture] = useState<string | null>(null);

  useEffect(() => {
    const savedPicture = localStorage.getItem("profilePicture");

    if (savedPicture) {
      setSelectedPicture(savedPicture);
    } else {
      const randomPicture =
        profilePictures[Math.floor(Math.random() * profilePictures.length)];
      setSelectedPicture(randomPicture);
      localStorage.setItem("profilePicture", randomPicture);
    }
  }, []);

  useEffect(() => {
    if (selectedPicture) {
      localStorage.setItem("profilePicture", selectedPicture);
    }
  }, [selectedPicture]);

  const handleRandomise = () => {
    // Filter out the current image
    const availablePictures = profilePictures.filter(
      (picture) => picture !== selectedPicture
    );

    // Randomly select from the remaining options
    const randomPicture =
      availablePictures[Math.floor(Math.random() * availablePictures.length)];

    setSelectedPicture(randomPicture);
  };

  return (
    <div className="flex flex-col items-center pt-4">
      <div className="relative">
        <ProfilePictureDisplay
          imageSrc={selectedPicture || profilePictures[0]}
          width={150}
        />

        <Button
          onClick={handleRandomise}
          size={"icon"}
          variant={"ghost"}
          className="absolute bottom-0.5 -right-0.5 bg-white rounded-full p-1 border-4 dark:hover:bg-white/75 border-white shadow-md z-20"
        >
          <RotateCw
            className="size-6 dark:text-black rotate-75"
            strokeWidth={2.5}
          />
        </Button>
      </div>
    </div>
  );
}
