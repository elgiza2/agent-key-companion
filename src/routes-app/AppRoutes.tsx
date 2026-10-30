import { Route, Navigate, useLocation } from "react-router-dom";
import WelcomePage from "@/pages/WelcomePage";
import {
  LegacyToolsRedirect,
  LegacyAiRedirect,
  ProtectedRoute,
  RetiredRedirect,
} from "./routeHelpers";
import { AnimatedShell } from "./AnimatedShell";
import {
  // chat
  ChatPage,
  SharedChatPage,
  SharedSitePage,
  ResearchPreviewPage,
  SlidesPreviewPage,
  AdminDashboardPage,
  SlidesFilePreviewPage,
  DocumentPreviewPage,
  FilePreviewPage,
  // auth hub
  AuthPage,
  OAuthCallbackPage,
  AppleCallbackPage,
  OAuthAuthorizePage,
  ResetPasswordPage,
  ChangeEmailPage,
  ChangePasswordPage,
  TwoFactorPage,
  MfaChallengePage,
  DeleteAccountPage,
  AcceptInvitePage,
  ReferralRedirectPage,
  // billing hub
  BillingSuccessPage,
  ReferralsPage,
  ReferralsDashboardTab,
  KPage,
  IntegrationsPage,
  IntegrationDetailPage,
  ReferralResourcesPage,
  ReferralPartnerTestPage,
  // integrations hub
  // settings
  SettingsPage,
  CustomizationPage,
  ProfileEditPage,
  SecuritySettingsPage,
  SecurityPage,
  LanguagePage,
  MailPage,
  PasswordsPage,
  UsagePage,
  McpSettingsPage,
  McpCallbackPage,
  AIPersonalizationPage,
  MemoryPage,
  SettingsSupportPage,
  SettingsHelpPage,
  SettingsContactPage,
  SettingsPrivacyPage,
  DataControlsPage,
  DataCategoryPage,
  CapabilitiesPage,
  CloudBrowserPage,
  DesktopBridgePage,
  SystemStatusPage,
  SkillsSettingsPage,
  SkillsNewPage,
  SkillsLibraryPage,
  ImageModelsPage,
  // marketing
  PricingPage,
  CheckoutPage,
  LegalPage,
  RestorePurchasePage,
  MegsyLandingPage,
  SplashTestPage,
  AgentsPage,
  AgentNewPage,
  AgentChatPage,
  AgentHubPage,
  TeamWorkspacePage,
  AgentSelectionPage,
} from "./lazyPages";

const toChat = <RetiredRedirect to="/chat" />;
const toPricing = <RetiredRedirect to="/pricing" />;
/** Agent chats belong to the normal chat page — old links keep working. */
const AgentChatRedirect = () => {
  const { search } = useLocation();
  const agent = new URLSearchParams(search).get("agent");
  return <Navigate to={agent ? `/chat?agent=${encodeURIComponent(agent)}` : "/chat"} replace />;
};

/** All application routes. Rendered inside <DeferredRoutes> in App.tsx. */
export const AppRoutes = ({ currentUserId }: { currentUserId: string | null }) => (
  <>
    {/* ── Entry ──────────────────────────────────────────────── */}
    <Route path="/" element={<ProtectedRoute guestEntry="/welcome"><ChatPage /></ProtectedRoute>} />
    <Route path="/chat" element={<ProtectedRoute guestEntry="/welcome"><ChatPage /></ProtectedRoute>} />
    <Route path="/agents" element={<ProtectedRoute><AgentSelectionPage /></ProtectedRoute>} />
    <Route path="/agents/directory" element={<Navigate to="/agents" replace />} />
    <Route path="/agents/conversations" element={<ProtectedRoute><AgentHubPage /></ProtectedRoute>} />
    <Route path="/agents/new" element={<ProtectedRoute><AgentNewPage /></ProtectedRoute>} />
    <Route path="/agents/chat" element={<ProtectedRoute><AgentChatRedirect /></ProtectedRoute>} />
    <Route path="/agents/chat/:sessionId" element={<ProtectedRoute><AgentChatRedirect /></ProtectedRoute>} />
    <Route path="/team" element={<ProtectedRoute><TeamWorkspacePage /></ProtectedRoute>} />
    <Route path="/welcome" element={<WelcomePage />} />
    <Route path="/index" element={<ProtectedRoute guestEntry="/welcome"><ChatPage /></ProtectedRoute>} />
    <Route path="/share/:shareId" element={<SharedChatPage />} />

    {/* ── Auth hub — one page, animated inner views ──────────── */}
    <Route element={<AnimatedShell />}>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signin" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/auth/apple-callback" element={<AppleCallbackPage />} />
      <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
      <Route path="/auth/mfa" element={<MfaChallengePage />} />
      <Route path="/oauth/authorize" element={<OAuthAuthorizePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/ref/:code" element={<ReferralRedirectPage />} />
      <Route path="/r/:code" element={<ReferralRedirectPage />} />
      <Route
        path="/settings/change-email"
        element={
          <ProtectedRoute>
            <ChangeEmailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/two-factor"
        element={
          <ProtectedRoute>
            <TwoFactorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/delete-account"
        element={
          <ProtectedRoute>
            <DeleteAccountPage />
          </ProtectedRoute>
        }
      />
    </Route>

    {/* ── Billing hub — one page, animated inner views ───────── */}
    <Route element={<AnimatedShell />}>
      <Route path="/settings/billing" element={<Navigate to="/usage" replace />} />
      <Route path="/billing/success" element={<BillingSuccessPage />} />
      <Route path="/suc" element={<BillingSuccessPage />} />
      <Route path="/settings/referrals" element={<Navigate to="/referrals" replace />} />
      <Route
        path="/settings/referrals/resources"
        element={<Navigate to="/referrals/resources" replace />}
      />
    </Route>

    {/* Integrations are managed from the chat composer sheet now. */}

    {/* ── Settings ──────────────────────────────────────────── */}
    <Route
      path="/settings"
      element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/customization"
      element={
        <ProtectedRoute>
          <CustomizationPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/ai-personalization"
      element={
        <ProtectedRoute>
          <AIPersonalizationPage />
        </ProtectedRoute>
      }
    />
    <Route path="/settings/profile" element={<Navigate to="/settings/profile/edit" replace />} />
    <Route
      path="/settings/profile/edit"
      element={
        <ProtectedRoute>
          <ProfileEditPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/usage"
      element={
        <ProtectedRoute>
          <UsagePage />
        </ProtectedRoute>
      }
    />
    <Route path="/settings/notifications" element={<Navigate to="/settings" replace />} />
    <Route path="/notifications" element={<Navigate to="/settings" replace />} />
    <Route
      path="/settings/security"
      element={
        <ProtectedRoute>
          <SecuritySettingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/language"
      element={
        <ProtectedRoute>
          <LanguagePage />
        </ProtectedRoute>
      }
    />
    {/* Mail is hidden until its UI is reworked — both entries land on chat. */}
    <Route path="/settings/mail" element={<Navigate to="/chat" replace />} />
    <Route
      path="/settings/passwords"
      element={
        <ProtectedRoute>
          <PasswordsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/mcp"
      element={
        <ProtectedRoute>
          <McpSettingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/mcp-callback"
      element={
        <ProtectedRoute>
          <McpCallbackPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/memory"
      element={
        <ProtectedRoute>
          <MemoryPage />
        </ProtectedRoute>
      }
    />
    <Route path="/tasks" element={<Navigate to="/agents" replace />} />
    <Route path="/tasks/*" element={<Navigate to="/agents" replace />} />
    <Route path="/settings/knowledge" element={<Navigate to="/settings/memory" replace />} />

    <Route
      path="/settings/skills"
      element={
        <ProtectedRoute>
          <SkillsSettingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/skills/new"
      element={
        <ProtectedRoute>
          <SkillsNewPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/skills/library"
      element={
        <ProtectedRoute>
          <SkillsLibraryPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/skills"
      element={
        <ProtectedRoute>
          <SkillsSettingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/support"
      element={
        <ProtectedRoute>
          <SettingsSupportPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/support/help"
      element={
        <ProtectedRoute>
          <SettingsHelpPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/support/contact"
      element={
        <ProtectedRoute>
          <SettingsContactPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/data"
      element={
        <ProtectedRoute>
          <DataControlsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/data/:category"
      element={
        <ProtectedRoute>
          <DataCategoryPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/privacy"
      element={
        <ProtectedRoute>
          <SettingsPrivacyPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/capabilities"
      element={
        <ProtectedRoute>
          <CapabilitiesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/cloud-browser"
      element={
        <ProtectedRoute>
          <CloudBrowserPage />
        </ProtectedRoute>
      }
    />
    {/* Hidden from settings navigation — reachable only via the test route */}
    <Route
      path="/test/desktop-bridge"
      element={
        <ProtectedRoute>
          <DesktopBridgePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/desktop-bridge"
      element={
        <ProtectedRoute>
          <DesktopBridgePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings/system-status"
      element={
        <ProtectedRoute>
          <SystemStatusPage />
        </ProtectedRoute>
      }
    />
    {/* Keep the settings destination compatible with older mobile links. */}
    <Route path="/settings/integrations" element={<Navigate to="/integrations" replace />} />

    {/* ── Research previews ─────────────────────────────────── */}
    <Route
      path="/research/preview/new"
      element={
        <ProtectedRoute>
          <ResearchPreviewPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/research/preview/:id"
      element={
        <ProtectedRoute>
          <ResearchPreviewPage />
        </ProtectedRoute>
      }
    />
    <Route path="/research/share/:token" element={<ResearchPreviewPage />} />

    {/* ── Documents & slides previews ───────────────────────── */}
    <Route path="/slides/preview/:id" element={<SlidesPreviewPage />} />
    <Route path="/slides/file-preview/:id" element={<SlidesFilePreviewPage />} />
    <Route path="/document/:artifactId" element={<DocumentPreviewPage />} />
    <Route path="/file-preview/:id" element={<FilePreviewPage />} />

    {/* ── Admin tools ───────────────────────────────────────── */}
    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <AdminDashboardPage />
        </ProtectedRoute>
      }
    />
    {/* ── Hidden admin (password gated) ─────────────────────── */}
    <Route path="/l" element={<ImageModelsPage />} />
    <Route path="/l/*" element={<ImageModelsPage />} />

    {/* ── Retired routes ────────────────────────────────────── */}

    {/* ── Pricing (only surviving marketing page) ───────────── */}
    <Route path="/pricing" element={<PricingPage />} />

    {/* ── Checkout — dedicated payment page, separate from pricing ── */}
    <Route path="/checkout" element={<CheckoutPage />} />

    {/* ── Security (settings-owned) ─────────────────────────── */}
    <Route path="/security" element={<SecurityPage />} />

    {/* ── Retired marketing / legal pages ───────────────────── */}
    <Route path="/se" element={toChat} />
    <Route path="/status" element={toChat} />
    <Route path="/ai-chat" element={toChat} />
    <Route path="/ai-chat/*" element={toChat} />
    <Route path="/features-guide" element={toPricing} />
    <Route path="/megsy-model" element={toPricing} />
    <Route path="/megay" element={toChat} />
    <Route path="/vs/:slug" element={toChat} />
    <Route path="/about" element={<LegalPage slug="about" />} />
    <Route path="/contact" element={<LegalPage slug="contact" />} />
    <Route path="/support" element={<Navigate to="/settings/support/help" replace />} />
    <Route path="/enterprise" element={toPricing} />
    <Route path="/trust" element={<Navigate to="/security" replace />} />
    <Route path="/terms" element={<LegalPage slug="terms" />} />
    <Route path="/privacy" element={<LegalPage slug="privacy" />} />
    <Route path="/cookies" element={<Navigate to="/privacy" replace />} />
    <Route path="/refund" element={<LegalPage slug="refund" />} />
    <Route path="/restore" element={<RestorePurchasePage />} />
    <Route path="/policies/*" element={<Navigate to="/privacy" replace />} />
    <Route path="/legal/*" element={<Navigate to="/privacy" replace />} />

    {/* ── Legacy aliases — everything retired now redirects ──── */}
    <Route path="/landing" element={<MegsyLandingPage />} />
    <Route path="/ar-eg" element={<MegsyLandingPage arabic />} />
    <Route path="/showcase" element={toChat} />
    <Route path="/test" element={<SplashTestPage />} />
    {/* Hidden internal agent sandbox — not linked anywhere. */}
    <Route path="/testr" element={<ReferralPartnerTestPage />} />
    <Route path="/code" element={toChat} />
    <Route path="/build" element={toChat} />
    <Route path="/anything" element={toChat} />
    <Route path="/apps" element={toChat} />
    <Route path="/library" element={toChat} />
    <Route path="/learn" element={toChat} />
    <Route path="/agent" element={toChat} />
    <Route path="/settings/workspaces" element={<Navigate to="/settings" replace />} />
    <Route path="/settings/workspaces/*" element={<Navigate to="/settings" replace />} />
    <Route path="/workspaces" element={<Navigate to="/settings" replace />} />
    <Route path="/workspaces/*" element={<Navigate to="/settings" replace />} />
    <Route path="/workspace" element={<Navigate to="/settings" replace />} />
    <Route path="/x" element={toChat} />
    <Route path="/promo/:code" element={toPricing} />
    <Route path="/eg" element={toChat} />
    <Route path="/eg/*" element={toChat} />
    <Route path="/s/:slug" element={<SharedSitePage />} />
    <Route path="/ai/*" element={<LegacyAiRedirect />} />
    <Route path="/tools/*" element={<LegacyToolsRedirect />} />
    <Route path="/services" element={toPricing} />
    <Route path="/media" element={toPricing} />
    <Route path="/gallery" element={toPricing} />
    <Route path="/preview/:type" element={toPricing} />
    <Route path="/template/:id" element={toPricing} />
    <Route path="/images/*" element={toPricing} />
    <Route path="/videos/*" element={toPricing} />
    <Route path="/cinema" element={toPricing} />
    <Route path="/cinema/*" element={toPricing} />
    <Route path="/for" element={toPricing} />
    <Route path="/for/*" element={toPricing} />
    <Route path="/compare" element={toPricing} />
    <Route path="/compare/*" element={toPricing} />
    <Route path="/templates" element={toPricing} />
    <Route path="/templates/*" element={toPricing} />
    <Route path="/models" element={toPricing} />
    <Route path="/models/*" element={toPricing} />
    <Route path="/solutions" element={toPricing} />
    <Route path="/solutions/*" element={toPricing} />
    <Route path="/tools" element={toPricing} />
    <Route path="/comparison" element={toPricing} />
    <Route path="/megsy" element={<Navigate to="/megsy-model" replace />} />
    <Route path="/features" element={<Navigate to="/features-guide" replace />} />
    <Route path="/compliance" element={<Navigate to="/privacy" replace />} />
    <Route path="/billing" element={<Navigate to="/usage" replace />} />
    <Route path="/k" element={<KPage />} />
    <Route path="/billing/referrals" element={<Navigate to="/referrals" replace />} />
    <Route
      path="/referrals"
      element={
        <ProtectedRoute>
          <ReferralsPage />
        </ProtectedRoute>
      }
    >
      <Route index element={<ReferralsDashboardTab />} />
    </Route>
    <Route
      path="/referrals/resources"
      element={
        <ProtectedRoute>
          <ReferralResourcesPage />
        </ProtectedRoute>
      }
    />
    {/* Sidebar destinations shared as short links must resolve, not 404. */}
    <Route path="/earn" element={<Navigate to="/referrals" replace />} />
    {/* Mail page is hidden until reworked; keep the import wired for the restore. */}
    <Route path="/mail" element={<Navigate to="/chat" replace />} />
    <Route path="/mail/*" element={<Navigate to="/chat" replace />} />
    <Route path="/settings/general" element={<Navigate to="/settings" replace />} />

    <Route path="/integrations" element={<IntegrationsPage />} />
    <Route path="/integrations/:app" element={<IntegrationDetailPage />} />
    <Route path="/integration" element={<Navigate to="/integrations" replace />} />
    <Route path="/settings/help" element={<Navigate to="/settings/support/help" replace />} />

    {/* ── Anything else is a real 404, not a soft-404 chat page ── */}
    <Route path="*" element={<Navigate to="/landing" replace />} />
  </>
);
