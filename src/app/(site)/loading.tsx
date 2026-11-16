import { NexusLoader } from "@/components/ui/NexusLoader";

export default function Loading() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <NexusLoader label="Entering territory" />
    </div>
  );
}
