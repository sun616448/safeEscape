import type { Metadata } from "next";
import PhoneFrame from "./PhoneFrame";

// Demo only: shows the real app ("/") inside a phone frame on a laptop or projector.
// The frame only ever loads the game; the hidden layer still has no URL of its own.
export const metadata: Metadata = {
  title: "Path Finder",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <PhoneFrame />;
}
