export type GalleryEntry = {
  id: string;
  title: string;
  type: "image" | "video";
  src: string;
  date: string;
};

export const galleryEntries: GalleryEntry[] = [
  {
    id: "anya",
    title: "Anya",
    type: "image",
    src: "/gallery/anya.jpg",
    date: "2022-06-02",
  },
  {
    id: "anya-timelapse",
    title: "Anya Timelapse",
    type: "video",
    src: "/gallery/anya.mp4",
    date: "2022-06-02",
  },
  {
    id: "emilia",
    title: "Emilia",
    type: "image",
    src: "/gallery/emilia.jpg",
    date: "2026-08-09",
  },
  {
    id: "emilia-timelapse",
    title: "Emilia Timelapse",
    type: "video",
    src: "/gallery/emilia.mp4",
    date: "2026-08-09",
  },
  {
    id: "doki-timelapse",
    title: "Doki Timelapse",
    type: "video",
    src: "/gallery/doki.mp4",
    date: "2022-09-08",
  },
  {
    id: "doki",
    title: "Doki",
    type: "image",
    src: "/gallery/doki.png",
    date: "2022-09-08",
  },
  {
    id: "spiderman",
    title: "Spiderman",
    type: "image",
    src: "/gallery/spiderman.png",
    date: "2022-01-08",
  },
  {
    id: "spiderman-timelapse",
    title: "Spiderman Timelapse",
    type: "video",
    src: "/gallery/spiderman.mov",
    date: "2022-01-08",
  },
];
