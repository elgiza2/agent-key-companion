import { render, waitFor } from "@testing-library/react";
import { it, expect } from "vitest";
import ChatMessage from "@/components/chat/ChatMessage";
const spec = JSON.stringify({title:"Compare",blocks:[{type:"table",columns:["","iPhone 16","S25"],rows:[["Price","$799","$699"]]},{type:"buttons",items:[{label:"More"}]}]},null,2);
it("renders a ui card even with dollar signs", async () => {
  const r = render(<ChatMessage role="assistant" content={"Here:\n```ui\n" + spec + "\n```"} {...({} as any)} />);
  await waitFor(() => expect(r.container.textContent).toContain("iPhone 16"), { timeout: 10000 });
  expect(r.container.textContent).not.toContain('"type"');
});
