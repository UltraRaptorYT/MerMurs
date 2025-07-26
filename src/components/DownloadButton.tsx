"use client";

import { Button } from "@/components/ui/button";
import React from "react";

interface DownloadButtonProps {
  fileUrl: string;
  fileName?: string;
  children?: React.ReactNode;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  fileUrl,
  fileName,
  children = "Download",
}) => {
  
  const handleClick = () => {
    const downloadUrl = `/api/download?url=${encodeURIComponent(
      fileUrl
    )}&filename=${fileName || "file.mp3"}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.setAttribute("download", fileName || "file.mp3");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Button onClick={handleClick} size={"icon"}>
      {children}
    </Button>
  );
};

export default DownloadButton;
