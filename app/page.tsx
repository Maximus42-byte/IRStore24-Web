import Image from "next/image";

export default function Home() {
  return (
    <main className="landing">
      <div className="poster">

        <Image
          src="/construction-bg.png"
          alt="IRStore24 Under Construction"
          fill
          priority
          className="posterImage"
        />

        <a
          href="https://t.me/IRStoore"
          target="_blank"
          rel="noopener noreferrer"
          className="hotspot telegram"
          aria-label="Telegram"
        />

        <a
          href="https://www.instagram.com/irstore_community?igsh=MTZjYzk2bWFqNTdsbg%3D%3D&utm_source=qr"
          target="_blank"
          rel="noopener noreferrer"
          className="hotspot discord"
          aria-label="Instagram"
        />

      </div>
    </main>
  );
}