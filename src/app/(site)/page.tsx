import { Landing } from "@/components/landing/Landing";
import { getSampleEdition } from "./_data";

export default function Home() {
  return <Landing edition={getSampleEdition()} />;
}
