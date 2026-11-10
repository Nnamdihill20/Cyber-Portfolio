# Scope boundary & legal notes

## The line this project keeps

This app maps **places and events**, never **specific people**:

- ALPR cameras and enforcement facilities are fixed infrastructure /
  government buildings — public record.
- Activity reports describe "something is happening near this location,"
  anonymously, and decay after a few hours. They never carry a name, badge
  number, license plate of an individual, or any field that could identify
  *who* is present.

This is a deliberate design constraint, not just a policy note — see the
schema in `packages/api/prisma/schema.prisma`: there is no field anywhere
that stores an individual's identity. Do not add one. In particular, do not
add features that track a specific named officer or agent, on duty or off
duty — that crosses from transparency into tracking a private individual's
movements, which is a doxxing/stalking risk regardless of the person's
profession.

## Get a real lawyer before launch

- Real-time enforcement-activity apps are a live, contested legal area in
  the US right now (app store takedowns, DOJ statements, ongoing
  litigation around apps in this space). Don't treat this document as
  legal advice — it isn't. Get counsel familiar with this specific area
  before you ship the activity-report layer (Layer B) or market the app
  publicly.
- Keep a web/PWA build independently deployable, since app store presence
  for apps in this category has not been reliable historically.
- Log retention: activity reports should hard-delete on expiry, not soft-delete
  to an archive — the whole point of Layer B is that it isn't a permanent
  record of anyone's movements.

## Data provenance

Every record in Layers A and C should carry a `source` field so you can
show — and defend — where a data point came from. Never mark
community-submitted data as `VERIFIED` confidence without an actual
verification step.
