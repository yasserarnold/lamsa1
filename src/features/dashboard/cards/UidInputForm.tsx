import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Radio } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onScan: () => void;
  onSubmit: () => void;
  scanning: boolean;
  scanDisabled: boolean;
  submitting: boolean;
  submitLabel: string;
};

function UidInputFormImpl(props: Props) {
  const { value, onChange, onScan, onSubmit, scanning, scanDisabled, submitting, submitLabel } =
    props;
  const { t } = useLanguage();
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  );
  return (
    <div className="space-y-3">
      <Label>{t("dash.cardsPage.uidLabel")}</Label>
      <div className="flex gap-2">
        <Input
          dir="ltr"
          placeholder="04ABCD1234"
          value={value}
          onChange={handleChange}
        />
        <Button
          variant="outline"
          onClick={onScan}
          disabled={scanDisabled}
          className="gap-2"
          type="button"
        >
          {scanning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Radio className="size-4" />
          )}
          {t("dash.cardsPage.scan")}
        </Button>
      </div>
      <Button
        className="w-full"
        disabled={!value || submitting}
        onClick={onSubmit}
        type="button"
      >
        {submitting && <Loader2 className="me-2 size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}

export const UidInputForm = memo(UidInputFormImpl);