import {
  groupEmailsByApplication,
  type JobApplication,
  type JobEmail,
} from "@/app/_fake/fakeJobDomainData";

export type Bucket = Readonly<{
  app: JobApplication & { id: string };
  emails: ReadonlyArray<JobEmail>;
}>;

export function toBuckets(
  apps: ReadonlyArray<JobApplication>,
  emails: ReadonlyArray<JobEmail>
): ReadonlyArray<Bucket> {
  const grouped = groupEmailsByApplication(emails);

  const normalBuckets: Bucket[] = apps.map((a) => ({
    app: a,
    emails: grouped[a.id] ?? [],
  }));

  const unassigned: Bucket = {
    app: {
      id: "__unassigned__",
      user_id: apps[0]?.user_id ?? "",
      company: "Unassigned",
      position: "Emails not linked to an application",
      status: "unknown",
      applied_at: null,
      last_activity_at: new Date().toISOString(),
      notes: "Bucket auto (frontend).",
      archived: false,
      created_by: "auto",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    emails: grouped["__unassigned__"] ?? [],
  };

  normalBuckets.sort((a, b) =>
    a.app.last_activity_at < b.app.last_activity_at ? 1 : -1
  );

  return [unassigned, ...normalBuckets];
}