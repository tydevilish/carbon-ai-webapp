import "./globals.css";

export const metadata = {
  title: "AI Carbon Dashboard",
  description: "Real-time Carbon Footprint Estimator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        {/* นำเข้าฟอนต์ Kanit */}
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Kanit', sans-serif" }} className="bg-neutral-950 text-white">
        {children}
      </body>
    </html>
  );
}