import { useEffect, useRef, useState } from "react";
import "./App.css";

const ASCII_CHARS = "@%#*+=-:. ";

const PALETTES = {
  indie: [
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
  ],
  gameboy: [
    [15, 56, 15],
    [48, 98, 48],
    [139, 172, 15],
    [155, 188, 15],
  ],
  cyberpunk: [
    [13, 2, 33],
    [56, 16, 81],
    [131, 33, 129],
    [234, 85, 162],
    [252, 157, 248],
    [0, 255, 255],
    [0, 128, 255],
  ],
  sunset: [
    [20, 12, 28],
    [68, 36, 52],
    [133, 76, 48],
    [217, 160, 102],
    [238, 195, 154],
    [251, 242, 54],
    [255, 128, 164],
  ],
  ocean: [
    [5, 19, 36],
    [13, 43, 69],
    [25, 78, 132],
    [57, 123, 172],
    [132, 183, 220],
    [198, 230, 247],
  ],
  grayscale: [
    [0, 0, 0],
    [64, 64, 64],
    [128, 128, 128],
    [192, 192, 192],
    [255, 255, 255],
  ],
};

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
  palette: number[][]
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
  palette: number[][],
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
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [imageRenderMode, setImageRenderMode] = useState<"ascii" | "pixel">("ascii");
  const [videoRenderMode, setVideoRenderMode] = useState<"ascii" | "pixel">("ascii");
  const [imageWidth, setImageWidth] = useState(100);
  const [videoWidth, setVideoWidth] = useState(100);
  const [imageInvert, setImageInvert] = useState(false);
  const [videoInvert, setVideoInvert] = useState(false);
  const [imagePalette, setImagePalette] = useState<keyof typeof PALETTES>("indie");
  const [videoPalette, setVideoPalette] = useState<keyof typeof PALETTES>("indie");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const asciiCanvasRef = useRef<HTMLCanvasElement>(null);
  const asciiOutputRef = useRef<HTMLPreElement>(null);
  const imagePixelCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoPixelCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoAsciiOutputRef = useRef<HTMLPreElement>(null);
  const rafRef = useRef<number | null>(null);

  const imageAsciiLUTRef = useRef<string[]>(buildAsciiLUT(ASCII_CHARS));
  const videoAsciiLUTRef = useRef<string[]>(buildAsciiLUT(ASCII_CHARS));

  useEffect(() => {
    const chars = imageInvert
      ? ASCII_CHARS.split("").reverse().join("")
      : ASCII_CHARS;
    imageAsciiLUTRef.current = buildAsciiLUT(chars);
  }, [imageInvert]);

  useEffect(() => {
    const chars = videoInvert
      ? ASCII_CHARS.split("").reverse().join("")
      : ASCII_CHARS;
    videoAsciiLUTRef.current = buildAsciiLUT(chars);
  }, [videoInvert]);

  useEffect(() => {
    if (!image) return;
    if (imageRenderMode === "ascii") {
      drawAsciiFrame(
        image,
        imageWidth,
        imageAsciiLUTRef.current,
        asciiCanvasRef.current!,
        asciiOutputRef.current!
      );
    } else {
      drawPixelFrame(
        image,
        imageWidth,
        PALETTES[imagePalette],
        imagePixelCanvasRef.current!
      );
    }
  }, [image, imageWidth, imageInvert, imageRenderMode, imagePalette]);

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
    if (!videoRef.current) return;

    if (videoRef.current.readyState === 4) {
      if (videoRenderMode === "ascii" && asciiCanvasRef.current && videoAsciiOutputRef.current) {
        drawAsciiFrame(
          videoRef.current,
          videoWidth,
          videoAsciiLUTRef.current,
          asciiCanvasRef.current,
          videoAsciiOutputRef.current
        );
      } else if (videoRenderMode === "pixel" && videoPixelCanvasRef.current) {
        drawPixelFrame(
          videoRef.current,
          videoWidth,
          PALETTES[videoPalette],
          videoPixelCanvasRef.current
        );
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      loop();
    }
  }, [videoWidth, videoInvert, videoRenderMode, videoPalette]);

  return (
    <div className="container">
      <h1 className="title">ASCII + Pixel Art Converter</h1>

      <div className="tabs">
        <button
          onClick={() => setActiveTab("image")}
          className={`tab ${activeTab === "image" ? "active" : ""}`}
        >
          Image
        </button>
        <button
          onClick={() => setActiveTab("video")}
          className={`tab ${activeTab === "video" ? "active" : ""}`}
        >
          Video
        </button>
      </div>

      {activeTab === "image" && (
        <div className="panel">
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
            className="file-input"
          />

          <div className="control-group">
            <label className="label">Render Mode</label>
            <div className="button-group">
              <button
                onClick={() => setImageRenderMode("ascii")}
                className={`mode-button ${imageRenderMode === "ascii" ? "active" : ""}`}
              >
                ASCII
              </button>
              <button
                onClick={() => setImageRenderMode("pixel")}
                className={`mode-button ${imageRenderMode === "pixel" ? "active" : ""}`}
              >
                Pixel Art
              </button>
            </div>
          </div>

          {imageRenderMode === "pixel" && (
            <div className="control-group">
              <label className="label">Palette</label>
              <select
                value={imagePalette}
                onChange={(e) => setImagePalette(e.target.value as keyof typeof PALETTES)}
                className="select"
              >
                {Object.keys(PALETTES).map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="control-group">
            <label className="label">Width: {imageWidth}</label>
            <input
              type="range"
              min={50}
              max={200}
              value={imageWidth}
              onChange={(e) => setImageWidth(+e.target.value)}
              className="slider"
            />
          </div>

          {imageRenderMode === "ascii" && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={imageInvert}
                onChange={(e) => setImageInvert(e.target.checked)}
              />
              Invert
            </label>
          )}

          <div className="output">
            {imageRenderMode === "ascii" ? (
              <pre ref={asciiOutputRef} className="ascii" />
            ) : (
              <canvas
                ref={imagePixelCanvasRef}
                style={{
                  width: `${imageWidth * 6}px`,
                  imageRendering: "pixelated",
                }}
                className="pixel-canvas"
              />
            )}
          </div>
        </div>
      )}

      {activeTab === "video" && (
        <div className="panel">
          <div className="button-group">
            <button onClick={startVideo} className="button" disabled={!!stream}>
              Start Webcam
            </button>
            <button onClick={stopVideo} className="button" disabled={!stream}>
              Stop Webcam
            </button>
          </div>

          {stream && (
            <>
              <div className="control-group">
                <label className="label">Render Mode</label>
                <div className="button-group">
                  <button
                    onClick={() => setVideoRenderMode("ascii")}
                    className={`mode-button ${videoRenderMode === "ascii" ? "active" : ""}`}
                  >
                    ASCII
                  </button>
                  <button
                    onClick={() => setVideoRenderMode("pixel")}
                    className={`mode-button ${videoRenderMode === "pixel" ? "active" : ""}`}
                  >
                    Pixel Art
                  </button>
                </div>
              </div>

              {videoRenderMode === "pixel" && (
                <div className="control-group">
                  <label className="label">Palette</label>
                  <select
                    value={videoPalette}
                    onChange={(e) => setVideoPalette(e.target.value as keyof typeof PALETTES)}
                    className="select"
                  >
                    {Object.keys(PALETTES).map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="control-group">
                <label className="label">Width: {videoWidth}</label>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={videoWidth}
                  onChange={(e) => setVideoWidth(+e.target.value)}
                  className="slider"
                />
              </div>

              {videoRenderMode === "ascii" && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={videoInvert}
                    onChange={(e) => setVideoInvert(e.target.checked)}
                  />
                  Invert
                </label>
              )}

              <div className="output">
                {videoRenderMode === "ascii" ? (
                  <pre ref={videoAsciiOutputRef} className="ascii" />
                ) : (
                  <canvas
                    ref={videoPixelCanvasRef}
                    style={{
                      width: `${videoWidth * 6}px`,
                      imageRendering: "pixelated",
                    }}
                    className="pixel-canvas"
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      <video ref={videoRef} hidden />
      <canvas ref={asciiCanvasRef} hidden />
    </div>
  );
}