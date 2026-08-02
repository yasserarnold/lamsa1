import { describe, it, expect } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";

const render = (ui: React.ReactElement) => rtlRender(<LanguageProvider>{ui}</LanguageProvider>);
import { CardEventList } from "./CardEventList";
import type { CardEventRow } from "./types";

const now = "2026-05-01T10:00:00Z";

function ev(over: Partial<CardEventRow>): CardEventRow {
  return {
    id: "e1",
    card_id: "c1",
    card_uid: "04ABCD1234",
    event_type: "activated",
    metadata: null,
    created_at: now,
    ...over,
  };
}

describe("CardEventList", () => {
  it("renders skeletons while loading", () => {
    const { container } = render(<CardEventList events={[]} isLoading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders empty state when there are no events", () => {
    render(<CardEventList events={[]} isLoading={false} />);
    expect(screen.getByText("لا توجد عمليات بعد")).toBeInTheDocument();
  });

  it("labels event types in Arabic and highlights failed writes", () => {
    render(
      <CardEventList
        isLoading={false}
        events={[
          ev({ id: "e1", event_type: "activated" }),
          ev({
            id: "e2",
            event_type: "written",
            metadata: { status: "failed", mode: "vcard", message: "boom" },
          }),
          ev({ id: "e3", event_type: "registered" }),
        ]}
      />,
    );
    expect(screen.getByText("تفعيل")).toBeInTheDocument();
    expect(screen.getByText("تسجيل")).toBeInTheDocument();
    expect(screen.getByText(/كتابة — فشلت/)).toBeInTheDocument();
    expect(screen.getByText("vCard")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});