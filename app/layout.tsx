import "./globals.css";

export const metadata = { title: "Lyrics Overlay", description: "Now-playing lyrics for Spotify" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        style={{
          margin: 0,
          backgroundColor: "#000",
          color: "#fff",
          fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}

