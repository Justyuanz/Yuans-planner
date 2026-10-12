import type { TaskProgressModel } from "./task-progress";

interface TaskProgressBannerProps {
  model: TaskProgressModel;
}

export function TaskProgressBanner({ model }: TaskProgressBannerProps) {
  return (
    <>
      <span id="dayMessage">{model.message}</span>
      <span className="progress-pill" id="progressText">{model.progress}</span>
    </>
  );
}
