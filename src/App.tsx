import { useEffect, useRef, useState } from "react";
import "./App.css";

const ASCII_CHARS = "@%#*+=-:. ";


//indie game palette
const PALETTE: [number, number, number][] = [
  [0, 0, 0],       
  [34, 32, 52],   
  [69, 40, 60],    
  [102, 57, 49],   
  [143, 86, 59],   
  [223, 113, 38], 
  [217, 160, 102],
  [238, 195, 154], 
  [251, 242, 54],  
  [153, 229, 80],  
  [106, 190, 48],  
  [55, 148, 110],  
  [75, 105, 186],  
  [91, 110, 225],  
  [203, 219, 252], 
  [255, 255, 255], 
];


function buildAsciiLUT(chars: string) {
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = chars[Math.floor((i / 255) * (chars.length - 1))];
  }
  return lut;
}

function drawAsciiFrame(
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  lut: string[],
  canvas: HTMLCanvasElement,
  output: HTMLPreElement
) {
  const ctx = canvas.getContext("2d")!;
  const aspect =
    source instanceof HTMLVideoElement
      ? source.videoHeight / source.videoWidth
      : source.height / source.width;

  const height = Math.floor(width * aspect * 0.55);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.drawImage(source, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;

  let result = "";
  let col = 0;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    result += lut[brightness | 0];
    col++;
    if (col === width) {
      result += "\n";
      col = 0;
    }
  }

  output.textContent = result;
}
function nearestColor(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][]
) {
  let minDist = Infinity;
  let best = palette[0];

  for (const [pr, pg, pb] of palette) {
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = dr * dr + dg * dg + db * db;

    if (dist < minDist) {
      minDist = dist;
      best = [pr, pg, pb];
    }
  }

  return best;
}


function drawPixelFrame(
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  palette: [number, number, number][],
  canvas: HTMLCanvasElement
) {
  const ctx = canvas.getContext("2d")!;
  const aspect =
    source instanceof HTMLVideoElement
      ? source.videoHeight / source.videoWidth
      : source.height / source.width;

  const height = Math.floor(width * aspect);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  const [pr, pg, pb] = nearestColor(r, g, b, palette);

  data[i] = pr;
  data[i + 1] = pg;
  data[i + 2] = pb;
}


  ctx.putImageData(imageData, 0, 0);
}

export default function App() {
  const [width, setWidth] = useState(100);
  const [invert, setInvert] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const asciiCanvasRef = useRef<HTMLCanvasElement>(null);
  const asciiOutputRef = useRef<HTMLPreElement>(null);
  const imagePixelCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoPixelCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const asciiLUTRef = useRef<string[]>(buildAsciiLUT(ASCII_CHARS));

  useEffect(() => {
    const chars = invert
      ? ASCII_CHARS.split("").reverse().join("")
      : ASCII_CHARS;
    asciiLUTRef.current = buildAsciiLUT(chars);
  }, [invert]);

  useEffect(() => {
    if (!image) return;
    drawAsciiFrame(
      image,
      width,
      asciiLUTRef.current,
      asciiCanvasRef.current!,
      asciiOutputRef.current!
    );
    drawPixelFrame(
      image,
      width,
      PALETTE,
      imagePixelCanvasRef.current!
    );
  }, [image, width, invert]);

  const startVideo = async () => {
    const media = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    setStream(media);
    if (videoRef.current) {
      videoRef.current.srcObject = media;
      await videoRef.current.play();
      loop();
    }
  };

  const stopVideo = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const loop = () => {
    if (
      !videoRef.current ||
      !asciiCanvasRef.current ||
      !asciiOutputRef.current ||
      !videoPixelCanvasRef.current
    )
      return;

    if (videoRef.current.readyState === 4) {
      drawAsciiFrame(
        videoRef.current,
        width,
        asciiLUTRef.current,
        asciiCanvasRef.current,
        asciiOutputRef.current
      );
      drawPixelFrame(
        videoRef.current,
        width,
        PALETTE,
        videoPixelCanvasRef.current
      );
    }

    rafRef.current = requestAnimationFrame(loop);
  };

  return (
    <div className="container">
      <h1>ASCII + Pixel Art</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const img = new Image();
          img.onload = () => setImage(img);
          img.src = URL.createObjectURL(f);
        }}
      />

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

      <pre ref={asciiOutputRef} className="output" />

      <canvas
        ref={imagePixelCanvasRef}
        style={{
          width: `${width * 6}px`,
          imageRendering: "pixelated",
        }}
      />

      <button onClick={startVideo}>Start Webcam</button>
      <button onClick={stopVideo}>Stop Webcam</button>

      <video ref={videoRef} hidden />

      <canvas
        ref={videoPixelCanvasRef}
        style={{
          width: `${width * 6}px`,
          imageRendering: "pixelated",
          border: "1px solid #444",
        }}
      />

      <canvas ref={asciiCanvasRef} hidden />
    </div>
  );
}
