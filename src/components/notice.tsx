import { AlertIcon, CheckIcon, InfoIcon } from "@/components/icons";

type NoticeTone = "success" | "error" | "info";

export function Notice({
  tone = "info",
  children,
}: {
  tone?: NoticeTone;
  children: React.ReactNode;
}) {
  const Icon = tone === "success" ? CheckIcon : tone === "error" ? AlertIcon : InfoIcon;
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}
