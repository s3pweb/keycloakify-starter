import { ComponentStory, ComponentMeta } from "@storybook/react";
import { createPageStory } from "../createPageStory";

const { PageStory } = createPageStory({
  pageId: "info.ftl",
});

export default {
  title: "login/Info",
  component: PageStory,
} as ComponentMeta<typeof PageStory>;

export const Default: ComponentStory<typeof PageStory> = () => <PageStory />;

export const Info: ComponentStory<typeof PageStory> = () => (
  <PageStory
    kcContext={{
      messageHeader: "My Custom Header",
      message: {
        summary: "My Realm Custom Message",
      },
      requiredActions: ["VERIFY_EMAIL", "UPDATE_PASSWORD"],

      realm: {
        displayName: "My Realm Custom Text",
        displayNameHtml: "My Realm Custom HTML",
      },

      locale: {
        currentLanguageTag: "fr",
      },
    }}
  />
);
