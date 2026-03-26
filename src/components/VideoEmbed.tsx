interface VideoEmbedProps {
  url: string;
}

export const VideoEmbed = ({ url }: VideoEmbedProps) => {
  if (!url) return null;

  // Extract Vimeo ID or use URL directly
  let embedUrl = url;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // YouTube support
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (youtubeMatch) {
    embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-card" style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title="Video"
      />
    </div>
  );
};
