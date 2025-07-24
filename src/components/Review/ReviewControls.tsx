import { Button } from "@/components/ui/button";

export default function ReviewControls({
  currentStep,
  maxSteps,
  onNext,
  onPrev,
}: {
  currentStep: number;
  maxSteps: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="flex justify-center gap-4 mb-4">
      <Button onClick={onPrev} disabled={currentStep === 0}>
        Back
      </Button>
      <p className="text-white font-bold">
        Review {currentStep + 1} / {maxSteps}
      </p>
      <Button onClick={onNext} disabled={currentStep + 1 >= maxSteps}>
        Next
      </Button>
    </div>
  );
}
