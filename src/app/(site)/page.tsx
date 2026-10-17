import { Home } from "@/components/home/Home";
import { getSampleEdition } from "./_data";

export default function Page() {
  return <Home edition={getSampleEdition()} />;
}
