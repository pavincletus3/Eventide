"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  className?: string;
  showDownload?: boolean;
}

export function QRCodeDisplay({
  data,
  size = 200,
  className = "",
  showDownload = true,
}: QRCodeDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-code-${data}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div
        className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setIsFullscreen(true)}
      >
        <QRCodeSVG
          id="qr-code-svg"
          value={data}
          size={size}
          level="H"
          includeMargin
          className="rounded"
        />
      </div>

      {showDownload && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download QR Code
        </Button>
      )}

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-8 rounded-lg">
            <QRCodeSVG
              value={data}
              size={Math.min(window.innerWidth - 100, 400)}
              level="H"
              includeMargin
              className="rounded"
            />
          </div>
          {showDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2 mt-4"
            >
              <Download className="w-4 h-4" />
              Download QR Code
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
