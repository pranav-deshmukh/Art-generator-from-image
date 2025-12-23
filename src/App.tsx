import { useEffect, useState } from "react";
import "./App.css";

const ASCII_CHARS = "@%#*+=-:. ";

function imageToAscii(
  img: HTMLImageElement,
  width: number,
  chars: string
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const aspectRatio = img.height / img.width;
  const height = Math.floor(width * aspectRatio * 0.55);

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  let ascii = "";

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];

    const brightness = (r + g + b) / 3;
    const index = Math.floor((brightness / 255) * (chars.length - 1));

    ascii += chars[index];

    if ((i / 4 + 1) % width === 0) ascii += "\n";
  }

  return ascii;
}

export default function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState(100);
  const [invert, setInvert] = useState(false);
  const [ascii, setAscii] = useState("");

  // Generate ASCII whenever inputs change
  useEffect(() => {
    if (!image) return;

    const chars = invert
      ? ASCII_CHARS.split("").reverse().join("")
      : ASCII_CHARS;

    const result = imageToAscii(image, width, chars);
    setAscii(result);
  }, [image, width, invert]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => setImage(img);
    img.src = URL.createObjectURL(file);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ascii);
  };

  const downloadAscii = () => {
    const blob = new Blob([ascii], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ascii-art.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <h1>🎨 ASCII Art Generator</h1>

      <input type="file" accept="image/*" onChange={handleImageUpload} />

      <div className="controls">
        <label>
          Width: {width}
          <input
            type="range"
            min={50}
            max={200}
            value={width}
            onChange={(e) => setWidth(+e.target.value)}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={invert}
            onChange={(e) => setInvert(e.target.checked)}
          />
          Invert
        </label>
      </div>

      <div className="buttons">
        <button onClick={copyToClipboard} disabled={!ascii}>
          Copy
        </button>
        <button onClick={downloadAscii} disabled={!ascii}>
          Download
        </button>
      </div>

      <pre className="output">{ascii}</pre>
    </div>
  );
}
