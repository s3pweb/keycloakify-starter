import { createUseI18n } from "keycloakify/account";

//NOTE: See src/login/i18n.ts for instructions on customization of i18n messages.
export const { useI18n } = createUseI18n({
  en: {
    passwordPolicy: "8 characters minimum, 1 uppercase, 1 lowercase, 1 digit",
    myApps: "My apps",
    accountManagementTitle: "B2P Connect SSO account management",
    accountManagementWelcomeMessage:
      "Welcome to your B2P Connect SSO account Management",
  },
  fr: {
    passwordPolicy: "8 characters minimum, 1 uppercase, 1 lowercase, 1 digit",
    myApps: "Mes applications",
    accountManagementTitle: "Gestion de votre compte B2P Connect SSO",
    accountManagementWelcomeMessage:
      "Bienvenue dans la Gestion de votre compte B2P Connect SSO",
  },
});

export type I18n = NonNullable<ReturnType<typeof useI18n>>;
