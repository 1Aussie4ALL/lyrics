import "./globals.css";

export const metadata = { title: "Lyrics Overlay", description: "Now-playing lyrics for Spotify" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#000",
          color: "#fff",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        {children}
      </body>
    </html>
  );
}

