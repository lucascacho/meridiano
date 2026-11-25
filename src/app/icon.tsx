import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#1c1916",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 18,
            height: 18,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 99,
            background: "#e36a3a",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
