/** @doc Security — email, password, 2FA, session and account deletion. */
import { useEffect, useState } from "react";
import {
  MailCheck,
  ShieldEllipsis,
  KeyRound,
  UserRoundX,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  SubShell,
  SubSection,
  SubRowList,
  SubRow,
  DangerCallout,
} from "@/components/settings/SubShell";
import { signOutEverywhere } from "@/lib/signOutEverywhere";

const SecuritySettingsPage = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserEmail(user.email || "");
      try {
        const { data: f } = await supabase.auth.mfa.listFactors();
        if (!cancelled) {
          const verified = (f?.totp || []).some((x: any) => x.status === "verified");
          setTwoFactorEnabled(verified);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    await signOutEverywhere();
  };

  return (
    <SubShell
      title="Security"
      subtitle="Manage sign-in credentials, two-factor authentication and your session."
    >
      <SubSection title="Sign-in" description="Update your email, password and multi-factor settings.">
        <SubRowList>
          <SubRow
            icon={MailCheck}
            label="Change email"
            hint={userEmail || "Update primary email"}
            onClick={() => navigate("/settings/change-email")}
          />
          <SubRow
            icon={KeyRound}
            label="Change password"
            hint="Update your account password"
            onClick={() => navigate("/settings/change-password")}
          />
          <SubRow
            icon={ShieldEllipsis}
            label="Two-factor authentication"
            hint={twoFactorEnabled ? "Enabled — OTP required at sign-in" : "Disabled — tap to set up"}
            onClick={() => navigate("/settings/two-factor")}
            trailing={twoFactorEnabled ? "On" : "Off"}
            tone={twoFactorEnabled ? "green" : "neutral"}
          />
        </SubRowList>
      </SubSection>

      <SubSection title="Session" description="Sign out of Megsy on this device.">
        <SubRowList>
          <SubRow icon={LogOut} label="Sign out" onClick={handleLogout} />
        </SubRowList>
      </SubSection>

      <SubSection title="Danger zone" description="Permanent actions. These cannot be undone.">
        <DangerCallout
          title="Delete account"
          description="All workspaces, chats and data are wiped. You have 30 days to cancel."
          action={
            <button
              onClick={() => navigate("/settings/delete-account")}
              className="gx-pill gx-pill-danger"
            >
              <UserRoundX className="h-3.5 w-3.5" strokeWidth={1.9} />
              Delete
            </button>
          }
        />
      </SubSection>
    </SubShell>
  );
};

export default SecuritySettingsPage;
