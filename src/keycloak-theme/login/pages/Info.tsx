import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";

export default function Info(props: PageProps<Extract<KcContext, { pageId: "info.ftl" }>, I18n>) {
  const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

  const { msgStr, msg } = i18n;

  const { messageHeader, message, requiredActions, skipLink, pageRedirectUri, actionUri, client } = kcContext;

  return (
    <Template
      {...{ kcContext, i18n, doUseDefaultCss, classes }}
      displayMessage={false}
      headerNode={messageHeader !== undefined ? <>{messageHeader}</> : <>{message?.summary}</>}
    >
      <div id="kc-info-message" style={{ textAlign: "center" }}>
        <p className="instruction">
          {/* {message.summary} */}

          {requiredActions !== undefined && (
            <b>
              {requiredActions.map((requiredAction) => (
                <div>{msgStr(`requiredAction.${requiredAction}` as const)}</div>
              ))}
            </b>
          )}
        </p>
        {!skipLink && pageRedirectUri !== undefined ? (
          <p>
            <a href={pageRedirectUri}>{msg("backToApplication")}</a>
          </p>
        ) : actionUri !== undefined ? (
          <p>
            <a href={actionUri}>{msg("proceedWithAction")}</a>
          </p>
        ) : (
          client.baseUrl !== undefined && (
            <p>
              <a href="https://www.b2pconnect.com/">{msg("backToApplication")}</a>
            </p>
          )
        )}
      </div>
    </Template>
  );
}
