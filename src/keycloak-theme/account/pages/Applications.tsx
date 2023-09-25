import type { PageProps } from "keycloakify/account/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";

export default function ApplicationsPage(
  props: PageProps<Extract<KcContext, { pageId: "applications.ftl" }>, I18n>
) {
  const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

  const { msg } = i18n;

  return (
    <Template
      {...{ kcContext, i18n, doUseDefaultCss, classes }}
      active="applications"
    >
      <h1>{msg("myApps")}</h1>
    </Template>
  );
}
