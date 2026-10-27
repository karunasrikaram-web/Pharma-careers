import { getRegistrationConfig } from "@/lib/settings";
import { JobAlertsPopup } from "@/components/job-alerts-popup";

export async function JobAlertsLayer() {
  const config = await getRegistrationConfig();
  return (
    <JobAlertsPopup
      enabled={config.enabled}
      delaySeconds={config.delaySeconds}
      title={config.title}
      privacyNote={config.privacyNote}
    />
  );
}
