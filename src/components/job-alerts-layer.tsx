import { getRegistrationConfig } from "@/lib/settings";
import { isReadOnlyFallback } from "@/lib/db";
import { JobAlertsPopup } from "@/components/job-alerts-popup";

export async function JobAlertsLayer() {
  const config = await getRegistrationConfig();
  return (
    <JobAlertsPopup
      // Saving details needs a writable database. Keep the manual button
      // working (it reports the read-only state) but skip the automatic popup.
      enabled={config.enabled && !isReadOnlyFallback()}
      delaySeconds={config.delaySeconds}
      title={config.title}
      privacyNote={config.privacyNote}
    />
  );
}
