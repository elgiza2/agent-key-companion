import { ACTION_STEPS, Renderer, type ActionEvent } from "@openuidev/react-lang";
import { library } from "./library";
import { runLibraryAction } from "./actions";
import { actionMessage } from "./action-message";
import "./theme-bridge.css";
export default function OpenUIRenderer({
  source,
  streaming = false,
  onSend,
}: {
  source: string;
  streaming?: boolean;
  onSend?: (text: string) => void;
}) {
  const onAction = (event: ActionEvent) => {
    if (event.type === ACTION_STEPS.ToAssistant) onSend?.(actionMessage(event));
    else if (
      event.type === ACTION_STEPS.OpenUrl &&
      typeof event.params.url === "string" &&
      /^https?:\/\//.test(event.params.url)
    )
      window.open(event.params.url, "_blank", "noopener,noreferrer");
    else void runLibraryAction(event);
  };
  return (
    <div className="megsy-openui not-prose my-4" dir="auto">
      <Renderer
        response={source}
        library={library}
        isStreaming={streaming}
        onAction={onAction}
        publishObservability={false}
      />
    </div>
  );
}
