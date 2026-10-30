/** @doc Responsive settings home. */
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopSettingsLayout from "@/components/settings/DesktopSettingsLayout";
import DesktopSettingsHome from "@/components/settings/DesktopSettingsHome";
import SettingsMobile from "@/components/settings/SettingsMobile";

const SettingsPage = () => {
  const isMobile = useIsMobile();
  if (!isMobile) {
    return (
      <DesktopSettingsLayout>
        <DesktopSettingsHome />
      </DesktopSettingsLayout>
    );
  }
  return <SettingsMobile />;
};

export default SettingsPage;
