import { APP_NAVIGATION } from "@/app/navigation";
import type { AppRoutePath } from "@/app/routeConstants";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";

export function PlaceholderPage({ route }: { route: AppRoutePath }) {
  const item = APP_NAVIGATION.find((navItem) => navItem.route === route);
  const title = item?.label ?? "CanonOS";

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageTitle>{title}</PageTitle>
        <PageSubtitle>{item?.description ?? "This CanonOS workspace will be implemented in a later module."}</PageSubtitle>
      </section>

      <SectionCard title={`${title} workspace`}>
        <PageActionBar className="justify-between">
          <p className="text-sm font-medium text-muted-foreground">Module placeholder</p>
          <Button type="button" variant="secondary" disabled>
            Coming soon
          </Button>
        </PageActionBar>
        <div className="mt-5">
          <EmptyState
            title={`${title} is not implemented yet`}
            message="This page already uses the shared CanonOS layout, spacing, typography, empty-state pattern, and navigation. Its data-backed workflow will arrive in its checklist milestone."
          />
        </div>
      </SectionCard>
    </div>
  );
}
