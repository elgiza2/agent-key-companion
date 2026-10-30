/** @doc Help & Support — glass hub: get help, resources, version footer. */
import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, Mail, FileText } from "lucide-react";
import {
  SubShell,
  SubSection,
  SubRowList,
  SubRow,
} from "@/components/settings/SubShell";

export default function SettingsSupportPage() {
  const navigate = useNavigate();

  return (
    <SubShell title="Help & Support">
      <SubSection title="Get help">
        <SubRowList>
          <SubRow
            icon={BookOpen}
            tone="blue"
            label="Help Center"
            hint="Browse articles and guides"
            onClick={() => navigate("/settings/support/help")}
          />
          <SubRow
            icon={Sparkles}
            tone="violet"
            label="Ask AI"
            hint="Instant answers from our agent"
            onClick={() => navigate("/chat")}
          />
          <SubRow
            icon={Mail}
            tone="green"
            label="Write to a human"
            hint="Typically replies in 24h"
            onClick={() => navigate("/settings/support/contact")}
          />
        </SubRowList>
      </SubSection>

      <SubSection title="Resources">
        <SubRowList>
          <SubRow
            icon={FileText}
            label="Documentation"
            hint="Technical specs and API reference"
            onClick={() => window.open("/contact", "_blank", "noopener")}
          />
        </SubRowList>
      </SubSection>

      <p className="text-center text-[12px] font-medium uppercase tracking-widest text-[color:var(--settings-muted)]">
        App Version 4.12.0 • Build 992
      </p>
    </SubShell>
  );
}
