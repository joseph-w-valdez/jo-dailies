export type GalleryEntry = {
  id: string;
  title: string;
  type: "image" | "video";
  /** Video clips default to timelapse unless set. */
  kind?: "timelapse" | "video";
  src: string;
  date: string;
};

export function galleryKindLabel(entry: GalleryEntry): string {
  if (entry.type === "image") return "🖼 Artwork";
  if (entry.kind === "video") return "🎬 Video";
  return "🎬 Timelapse";
}

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
    id: "doki",
    title: "Doki",
    type: "image",
    src: "/gallery/doki.png",
    date: "2022-09-08",
  },
  {
    id: "doki-timelapse",
    title: "Doki Timelapse",
    type: "video",
    src: "/gallery/doki.mp4",
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
  {
    id: "ram",
    title: "Ram",
    type: "image",
    src: "/gallery/ram.jpg",
    date: "2026-08-12",
  },
  {
    id: "ram-timelapse",
    title: "Ram Timelapse",
    type: "video",
    src: "/gallery/ram.mp4",
    date: "2026-08-12",
  },
  {
    id: "coffee-cup",
    title: "Coffee Cup",
    type: "image",
    src: "/gallery/coffee%20cup.jpg",
    date: "2019-10-15",
  },
  {
    id: "hand-study",
    title: "Hand Study",
    type: "image",
    src: "/gallery/hand%20study.png",
    date: "2020-08-13",
  },
  {
    id: "ironman",
    title: "Ironman",
    type: "image",
    src: "/gallery/ironman.png",
    date: "2021-03-06",
  },
  {
    id: "pokemon-starter-terrarium",
    title: "Pokemon Starter Terrarium",
    type: "image",
    src: "/gallery/pokemon%20starter%20terrarium.jpg",
    date: "2021-08-07",
  },
  {
    id: "pokemon-pikachu-eevee-terrarium",
    title: "Pokemon Pikachu & Eevee Terrarium",
    type: "image",
    src: "/gallery/pokemon%20pikachu%20and%20eevee%20terrarium.jpg",
    date: "2021-08-07",
  },
  {
    id: "pokemon-alolan-vulpix-terrarium",
    title: "Pokemon Alolan Vulpix Terrarium",
    type: "video",
    kind: "video",
    src: "/gallery/pokemon%20alolan%20vulpix%20terrarium.mp4",
    date: "2020-02-12",
  },
  {
    id: "valley-lake-sunset",
    title: "Valley Lake Sunset",
    type: "image",
    src: "/gallery/valley%20lake%20sunset.jpg",
    date: "2019-10-02",
  },
];
