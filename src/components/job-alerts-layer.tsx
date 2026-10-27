import { getRegistrationConfig } from "@/lib/settings";
import { JobAlertsPopup } from "@/components/job-alerts-popup";

export function JobAlertsLayer() {
  const config = getRegistrationConfig();
  return (
    <JobAlertsPopup
      enabled={config.enabled}
      delaySeconds={config.delaySeconds}
      title={config.title}
      privacyNote={config.privacyNote}
    />
  );
}
