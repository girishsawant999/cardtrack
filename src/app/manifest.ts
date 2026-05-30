import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CardTrack — Credit Card Bill Tracker",
    short_name: "CardTrack",
    description:
      "Track your credit card bills effortlessly. Auto-detect statements from email, get due date reminders, and never miss a payment.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#7c6df0",
    orientation: "portrait",
    categories: ["finance", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
