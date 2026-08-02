import { describe, it, expect, vi } from "vitest";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";

const render = (ui: React.ReactElement) => rtlRender(<LanguageProvider>{ui}</LanguageProvider>);
import { CardListItem } from "./CardListItem";
import type { CardRow } from "./types";

function makeCard(over: Partial<CardRow> = {}): CardRow {
  return {
    id: "c1",
    card_uid: "04ABCD1234",
    is_official: true,
    status: "active",
    activated_at: "2026-01-01T00:00:00Z",
    last_written_at: null,
    profile_id: "p1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("CardListItem", () => {
  it("renders UID, official badge, and active status", () => {
    render(
      <CardListItem
        card={makeCard()}
        nfcSupported
        writing={false}
        toggling={false}
        onToggle={vi.fn()}
        onPreview={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("04ABCD1234")).toBeInTheDocument();
    expect(screen.getByText("رسمية")).toBeInTheDocument();
    expect(screen.getByText("نشطة")).toBeInTheDocument();
    expect(screen.getByText(/لم تُكتب بعد/)).toBeInTheDocument();
  });

  it("shows disabled state label and hides official badge for user cards", () => {
    render(
      <CardListItem
        card={makeCard({ status: "disabled", is_official: false })}
        nfcSupported
        writing={false}
        toggling={false}
        onToggle={vi.fn()}
        onPreview={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("معطّلة")).toBeInTheDocument();
    expect(screen.queryByText("رسمية")).not.toBeInTheDocument();
  });

  it("disables preview when NFC is unsupported", () => {
    render(
      <CardListItem
        card={makeCard()}
        nfcSupported={false}
        writing={false}
        toggling={false}
        onToggle={vi.fn()}
        onPreview={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /معاينة وكتابة/ })).toBeDisabled();
  });

  it("invokes callbacks on preview and delete", () => {
    const onPreview = vi.fn();
    const onDelete = vi.fn();
    render(
      <CardListItem
        card={makeCard()}
        nfcSupported
        writing={false}
        toggling={false}
        onToggle={vi.fn()}
        onPreview={onPreview}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /معاينة وكتابة/ }));
    fireEvent.click(screen.getByRole("button", { name: "حذف" }));
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});