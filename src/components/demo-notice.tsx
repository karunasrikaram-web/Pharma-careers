import { InfoIcon } from "@/components/icons";
import { DEMO_DISCLAIMER } from "@/lib/constants";

export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="demo-notice" role="note">
      <InfoIcon size={18} />
      <p>
        <strong>Sample data.</strong> {DEMO_DISCLAIMER}
        {children ? <> {children}</> : null}
      </p>
    </div>
  );
}
